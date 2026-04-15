import hashlib
import secrets

from django.db import models


class Event(models.Model):
    title = models.CharField(max_length=255, default="Housewarming")
    slug = models.SlugField(max_length=64, unique=True, default="housewarming")
    public_blurb = models.TextField(blank=True)
    date_label = models.CharField(max_length=255, blank=True)
    time_label = models.CharField(max_length=255, blank=True)
    location = models.TextField(blank=True)
    details = models.TextField(blank=True)
    invite_token_hash = models.CharField(max_length=64, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Events"

    def __str__(self):
        return self.title

    @staticmethod
    def hash_token(raw_token):
        return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()

    def has_valid_invite_token(self, raw_token):
        if not raw_token or not self.invite_token_hash:
            return False
        return secrets.compare_digest(self.invite_token_hash, self.hash_token(raw_token))

    def rotate_invite_token(self):
        raw_token = secrets.token_urlsafe(6)
        self.invite_token_hash = self.hash_token(raw_token)
        self.save(update_fields=["invite_token_hash", "updated_at"])
        return raw_token


class Rsvp(models.Model):
    class AttendanceStatus(models.TextChoices):
        GOING = "going", "Going"
        MAYBE = "maybe", "Maybe"
        CANT_GO = "cant_go", "Can't Go"

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="rsvps")
    name = models.CharField(max_length=255)
    email = models.EmailField(blank=True)
    arrival_time = models.TimeField(blank=True, null=True)
    attendance_status = models.CharField(
        max_length=16,
        choices=AttendanceStatus.choices,
        default=AttendanceStatus.GOING,
    )
    likely_late = models.BooleanField(default=False)
    potluck_item = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["arrival_time", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["event", "email"],
                condition=~models.Q(email=""),
                name="unique_non_blank_event_rsvp_email",
            )
        ]

    def __str__(self):
        return self.name
