from django.db import models


class Rsvp(models.Model):
    class AttendanceStatus(models.TextChoices):
        GOING = "going", "Going"
        MAYBE = "maybe", "Maybe"
        CANT_GO = "cant_go", "Can't Go"

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
                fields=["email"],
                condition=~models.Q(email=""),
                name="unique_non_blank_rsvp_email",
            )
        ]

    def __str__(self):
        return self.name
