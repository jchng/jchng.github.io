from django.db import migrations, models
import django.db.models.deletion


def forward_copy_housewarming_to_event(apps, schema_editor):
    Event = apps.get_model("rsvp", "Event")
    HousewarmingSettings = apps.get_model("rsvp", "HousewarmingSettings")
    Rsvp = apps.get_model("rsvp", "Rsvp")

    housewarming_settings = HousewarmingSettings.objects.order_by("id").first()
    if housewarming_settings:
        event = Event.objects.create(
            title="Housewarming",
            slug="housewarming",
            date_label=housewarming_settings.date_label,
            time_label=housewarming_settings.time_label,
            location=housewarming_settings.location,
            details=housewarming_settings.details,
            invite_token_hash=housewarming_settings.invite_token_hash,
            created_at=housewarming_settings.created_at,
            updated_at=housewarming_settings.updated_at,
        )
    else:
        event = Event.objects.create(title="Housewarming", slug="housewarming")

    Rsvp.objects.filter(event__isnull=True).update(event=event)


class Migration(migrations.Migration):

    dependencies = [
        ("rsvp", "0006_housewarmingsettings"),
    ]

    operations = [
        migrations.CreateModel(
            name="Event",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(default="Housewarming", max_length=255)),
                ("slug", models.SlugField(default="housewarming", max_length=64, unique=True)),
                ("public_blurb", models.TextField(blank=True)),
                ("date_label", models.CharField(blank=True, max_length=255)),
                ("time_label", models.CharField(blank=True, max_length=255)),
                ("location", models.TextField(blank=True)),
                ("details", models.TextField(blank=True)),
                ("invite_token_hash", models.CharField(blank=True, max_length=64)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"verbose_name_plural": "Events"},
        ),
        migrations.AddField(
            model_name="rsvp",
            name="event",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="rsvps", to="rsvp.event"),
        ),
        migrations.RunPython(forward_copy_housewarming_to_event, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="rsvp",
            name="event",
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="rsvps", to="rsvp.event"),
        ),
        migrations.RemoveConstraint(
            model_name="rsvp",
            name="unique_non_blank_rsvp_email",
        ),
        migrations.AddConstraint(
            model_name="rsvp",
            constraint=models.UniqueConstraint(condition=~models.Q(email=""), fields=("event", "email"), name="unique_non_blank_event_rsvp_email"),
        ),
        migrations.DeleteModel(
            name="HousewarmingSettings",
        ),
    ]
