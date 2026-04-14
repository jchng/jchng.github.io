import json

from django.test import TestCase
from django.urls import reverse

from .models import Rsvp


class RsvpApiTests(TestCase):
    def test_summary_returns_public_attendees_and_potluck(self):
        Rsvp.objects.create(
            name="Annie",
            email="annie@example.com",
            arrival_time="11:30",
            attendance_status="going",
            likely_late=False,
            potluck_item="chips",
            notes="all good",
        )
        Rsvp.objects.create(
            name="Sam",
            email="sam@example.com",
            arrival_time="13:00",
            attendance_status="maybe",
            likely_late=True,
            potluck_item="",
        )

        response = self.client.get(reverse("rsvp-summary"))

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(
            payload["attendees"],
            [
                {"id": 1, "name": "Annie", "arrivalTime": "11:30", "attendanceStatus": "going", "likelyLate": False},
                {"id": 2, "name": "Sam", "arrivalTime": "13:00", "attendanceStatus": "maybe", "likelyLate": True},
            ],
        )
        self.assertEqual(payload["potluckItems"], [{"label": "chips"}])

    def test_lookup_by_email_returns_edit_payload(self):
        rsvp = Rsvp.objects.create(
            name="Jarret",
            email="jarret@example.com",
            arrival_time="12:15",
            attendance_status="maybe",
            likely_late=True,
            potluck_item="fruit salad",
            notes="might be late after brunch",
        )

        response = self.client.get(reverse("rsvp-lookup"), {"email": "jarret@example.com"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "status": "matched",
                "attendee": {
                    "id": rsvp.id,
                    "name": "Jarret",
                    "email": "jarret@example.com",
                    "arrivalTime": "12:15",
                    "attendanceStatus": "maybe",
                    "likelyLate": True,
                    "potluckItem": "fruit salad",
                    "notes": "might be late after brunch",
                },
            },
        )

    def test_lookup_missing_email_returns_not_found(self):
        response = self.client.get(reverse("rsvp-lookup"), {"email": "missing@example.com"})

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json(), {"status": "not_found"})

    def test_create_rsvp_rejects_duplicate_email(self):
        Rsvp.objects.create(
            name="Existing",
            email="existing@example.com",
            arrival_time="11:00",
            attendance_status="going",
            likely_late=False,
        )

        response = self.client.post(
            reverse("rsvp-list"),
            data=json.dumps(
                {
                    "name": "New Person",
                    "email": "existing@example.com",
                    "arrival_time": "12:00",
                    "attendance_status": "going",
                    "likely_late": False,
                    "potluck_item": "",
                    "notes": "",
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json()["code"], "duplicate_email")

    def test_create_cant_go_rsvp_allows_blank_arrival_time(self):
        response = self.client.post(
            reverse("rsvp-list"),
            data=json.dumps(
                {
                    "name": "Cannot Make It",
                    "email": "cantgo@example.com",
                    "arrival_time": "",
                    "attendance_status": "cant_go",
                    "likely_late": True,
                    "potluck_item": "",
                    "notes": "Sorry!",
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        rsvp = Rsvp.objects.get(email="cantgo@example.com")
        self.assertIsNone(rsvp.arrival_time)
        self.assertEqual(rsvp.attendance_status, "cant_go")
        self.assertFalse(rsvp.likely_late)

    def test_update_rsvp_allows_email_change(self):
        rsvp = Rsvp.objects.create(
            name="Before",
            email="before@example.com",
            arrival_time="11:00",
            attendance_status="going",
            likely_late=False,
            potluck_item="chips",
            notes="before note",
        )

        response = self.client.put(
            reverse("rsvp-detail", args=[rsvp.id]),
            data=json.dumps(
                {
                    "name": "After",
                    "email": "after@example.com",
                    "arrival_time": "14:30",
                    "attendance_status": "maybe",
                    "likely_late": True,
                    "potluck_item": "fruit salad",
                    "notes": "bringing snacks",
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        rsvp.refresh_from_db()
        self.assertEqual(rsvp.name, "After")
        self.assertEqual(rsvp.email, "after@example.com")
        self.assertEqual(rsvp.arrival_time.isoformat(timespec="minutes"), "14:30")
        self.assertEqual(rsvp.attendance_status, "maybe")
        self.assertTrue(rsvp.likely_late)
        self.assertEqual(rsvp.potluck_item, "fruit salad")
        self.assertEqual(rsvp.notes, "bringing snacks")
