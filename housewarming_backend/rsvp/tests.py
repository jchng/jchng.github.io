import json

from django.test import TestCase
from django.urls import reverse

from .models import Event, Rsvp


class RsvpApiTests(TestCase):
    def setUp(self):
        self.event = Event.objects.get(slug="housewarming")
        self.event.title = "Housewarming"
        self.event.date_label = "Saturday, 14 June 2026"
        self.event.time_label = "11:00 am to 7:00 pm"
        self.event.location = "123 Example Street, Melbourne"
        self.event.details = "Ring the bell when you arrive."
        self.event.public_blurb = ""
        self.event.save()
        self.invite_token = self.event.rotate_invite_token()

    def auth_headers(self, token=None):
        return {
            "HTTP_AUTHORIZATION": f"Bearer {token or self.invite_token}",
            "HTTP_X_EVENT_SLUG": self.event.slug,
        }

    def auth_query(self, token=None, **params):
        return {"token": token or self.invite_token, "event": self.event.slug, **params}

    def test_event_details_requires_valid_token(self):
        response = self.client.get(reverse("event-details"), {"event": self.event.slug})

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["code"], "invalid_invite")

    def test_event_details_requires_event_slug(self):
        response = self.client.get(reverse("event-details"), {}, **{"HTTP_AUTHORIZATION": f"Bearer {self.invite_token}"})

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["code"], "missing_event")

    def test_event_details_returns_private_metadata_with_valid_token(self):
        response = self.client.get(reverse("event-details"), self.auth_query())

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json()["event"],
            {
                "title": "Housewarming",
                "publicBlurb": "",
                "dateLabel": "Saturday, 14 June 2026",
                "timeLabel": "11:00 am to 7:00 pm",
                "location": "123 Example Street, Melbourne",
                "details": "Ring the bell when you arrive.",
            },
        )

    def test_summary_returns_public_attendees_and_potluck(self):
        Rsvp.objects.create(
            event=self.event,
            name="Annie",
            email="annie@example.com",
            arrival_time="11:30",
            attendance_status="going",
            likely_late=False,
            potluck_item="chips",
            notes="all good",
        )
        Rsvp.objects.create(
            event=self.event,
            name="Sam",
            email="sam@example.com",
            arrival_time="13:00",
            attendance_status="maybe",
            likely_late=True,
            potluck_item="",
        )

        response = self.client.get(reverse("rsvp-summary"), self.auth_query())

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
            event=self.event,
            name="Jarret",
            email="jarret@example.com",
            arrival_time="12:15",
            attendance_status="maybe",
            likely_late=True,
            potluck_item="fruit salad",
            notes="might be late after brunch",
        )

        response = self.client.get(
            reverse("rsvp-lookup"),
            self.auth_query(email="jarret@example.com"),
        )

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
        response = self.client.get(
            reverse("rsvp-lookup"),
            self.auth_query(email="missing@example.com"),
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json(), {"status": "not_found"})

    def test_summary_rejects_invalid_token(self):
        response = self.client.get(reverse("rsvp-summary"), self.auth_query(token="bad-token"))

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["code"], "invalid_invite")

    def test_create_rsvp_rejects_duplicate_email_for_same_event(self):
        Rsvp.objects.create(
            event=self.event,
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
            **self.auth_headers(),
        )

        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json()["code"], "duplicate_email")

    def test_create_rsvp_allows_duplicate_email_for_other_event(self):
        other_event = Event.objects.create(title="Dinner", slug="dinner")
        Rsvp.objects.create(
            event=other_event,
            name="Existing",
            email="shared@example.com",
            arrival_time="11:00",
            attendance_status="going",
            likely_late=False,
        )

        response = self.client.post(
            reverse("rsvp-list"),
            data=json.dumps(
                {
                    "name": "New Person",
                    "email": "shared@example.com",
                    "arrival_time": "12:00",
                    "attendance_status": "going",
                    "likely_late": False,
                    "potluck_item": "",
                    "notes": "",
                }
            ),
            content_type="application/json",
            **self.auth_headers(),
        )

        self.assertEqual(response.status_code, 201)

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
            **self.auth_headers(),
        )

        self.assertEqual(response.status_code, 201)
        rsvp = Rsvp.objects.get(event=self.event, email="cantgo@example.com")
        self.assertIsNone(rsvp.arrival_time)
        self.assertEqual(rsvp.attendance_status, "cant_go")
        self.assertFalse(rsvp.likely_late)

    def test_update_rsvp_allows_email_change(self):
        rsvp = Rsvp.objects.create(
            event=self.event,
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
            **self.auth_headers(),
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

    def test_create_rsvp_requires_valid_invite_token(self):
        response = self.client.post(
            reverse("rsvp-list"),
            data=json.dumps(
                {
                    "name": "No Invite",
                    "email": "noinvite@example.com",
                    "arrival_time": "12:00",
                    "attendance_status": "going",
                    "likely_late": False,
                    "potluck_item": "",
                    "notes": "",
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["code"], "missing_event")

    def test_rotating_invite_token_invalidates_previous_token(self):
        previous_token = self.invite_token
        new_token = self.event.rotate_invite_token()

        old_response = self.client.get(reverse("event-details"), self.auth_query(token=previous_token))
        new_response = self.client.get(reverse("event-details"), self.auth_query(token=new_token))

        self.assertEqual(old_response.status_code, 403)
        self.assertEqual(new_response.status_code, 200)
