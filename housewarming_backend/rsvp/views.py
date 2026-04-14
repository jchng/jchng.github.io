import json
from datetime import time

from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods

from .models import Rsvp


def _json_response(payload, status=200):
    return JsonResponse(payload, status=status)


def _is_duplicate_email_error(error):
    message = str(error).lower()
    return (
        "unique_non_blank_rsvp_email" in message
        or "unique constraint failed: rsvp_rsvp.email" in message
    )


def _serialize_public_attendee(rsvp):
    return {
        "id": rsvp.id,
        "name": rsvp.name,
        "arrivalTime": rsvp.arrival_time.isoformat(timespec="minutes") if rsvp.arrival_time else "",
        "attendanceStatus": rsvp.attendance_status,
        "likelyLate": rsvp.likely_late,
    }


def _serialize_private_attendee(rsvp):
    payload = _serialize_public_attendee(rsvp)
    payload["email"] = rsvp.email
    payload["potluckItem"] = rsvp.potluck_item
    payload["notes"] = rsvp.notes
    return payload


def _summary_payload():
    rsvps = Rsvp.objects.exclude(
        attendance_status=Rsvp.AttendanceStatus.CANT_GO
    )

    attendees = [_serialize_public_attendee(rsvp) for rsvp in rsvps]

    potluck_items = [
        {"label": rsvp.potluck_item}
        for rsvp in rsvps.exclude(potluck_item="")
    ]
    return {"attendees": attendees, "potluckItems": potluck_items}


def _parse_json_body(request):
    try:
        return json.loads(request.body.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        raise ValidationError("Invalid JSON body.")


def _parse_time(value):
    parts = value.split(":")
    if len(parts) != 2:
        raise ValidationError("Arrival time must use HH:MM format.")
    try:
        hours = int(parts[0])
        minutes = int(parts[1])
        return time(hour=hours, minute=minutes)
    except ValueError as exc:
        raise ValidationError("Arrival time must use HH:MM format.") from exc


def _clean_payload(payload):
    name = str(payload.get("name", "")).strip()
    email = str(payload.get("email", "")).strip().lower()
    arrival_time = str(payload.get("arrival_time", "")).strip()
    attendance_status = str(payload.get("attendance_status", Rsvp.AttendanceStatus.GOING)).strip().lower()
    potluck_item = str(payload.get("potluck_item", "")).strip()
    notes = str(payload.get("notes", "")).strip()
    likely_late = bool(payload.get("likely_late", False))

    if not name:
        raise ValidationError("Name is required.")
    if attendance_status not in Rsvp.AttendanceStatus.values:
        raise ValidationError("Attendance status must be going, maybe, or can't go.")
    if attendance_status != Rsvp.AttendanceStatus.CANT_GO and not arrival_time:
        raise ValidationError("Arrival time is required.")

    return {
        "name": name,
        "email": email,
        "arrival_time": _parse_time(arrival_time) if arrival_time else None,
        "attendance_status": attendance_status,
        "likely_late": False if attendance_status == Rsvp.AttendanceStatus.CANT_GO else likely_late,
        "potluck_item": potluck_item,
        "notes": notes,
    }


@require_GET
def summary(request):
    return _json_response(_summary_payload())


@require_GET
def lookup(request):
    email = request.GET.get("email", "").strip().lower()
    if not email:
        return _json_response({"status": "not_found"}, status=404)

    try:
        rsvp = Rsvp.objects.get(email=email)
    except Rsvp.DoesNotExist:
        return _json_response({"status": "not_found"}, status=404)

    return _json_response({"status": "matched", "attendee": _serialize_private_attendee(rsvp)})


@csrf_exempt
@require_http_methods(["POST", "OPTIONS"])
def rsvp_list(request):
    if request.method == "OPTIONS":
        return _json_response({}, status=204)

    try:
        payload = _clean_payload(_parse_json_body(request))
    except ValidationError as exc:
        return _json_response({"code": "invalid_payload", "detail": exc.message}, status=400)

    try:
        rsvp = Rsvp.objects.create(**payload)
    except IntegrityError as error:
        if _is_duplicate_email_error(error):
            return _json_response(
                {
                    "code": "duplicate_email",
                    "detail": "That email already exists. Do you want to edit that RSVP instead?",
                },
                status=409,
            )
        return _json_response(
            {
                "code": "save_failed",
                "detail": "Could not save your RSVP right now. Ask Jarret to check the server migrations.",
            },
            status=500,
        )

    return _json_response(
        {
            "status": "created",
            "attendee": _serialize_private_attendee(rsvp),
            "summary": _summary_payload(),
        },
        status=201,
    )


@csrf_exempt
@require_http_methods(["PUT", "OPTIONS"])
def rsvp_detail(request, rsvp_id):
    if request.method == "OPTIONS":
        return _json_response({}, status=204)

    rsvp = get_object_or_404(Rsvp, pk=rsvp_id)

    try:
        payload = _clean_payload(_parse_json_body(request))
    except ValidationError as exc:
        return _json_response({"code": "invalid_payload", "detail": exc.message}, status=400)

    for field, value in payload.items():
        setattr(rsvp, field, value)

    try:
        rsvp.save()
    except IntegrityError as error:
        if _is_duplicate_email_error(error):
            return _json_response(
                {
                    "code": "duplicate_email",
                    "detail": "That email already exists. Do you want to edit that RSVP instead?",
                },
                status=409,
            )
        return _json_response(
            {
                "code": "save_failed",
                "detail": "Could not save your RSVP right now. Ask Jarret to check the server migrations.",
            },
            status=500,
        )

    return _json_response(
        {
            "status": "updated",
            "attendee": _serialize_private_attendee(rsvp),
            "summary": _summary_payload(),
        }
    )
