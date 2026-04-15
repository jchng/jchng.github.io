from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("rsvp", "0005_alter_rsvp_arrival_time"),
    ]

    operations = [
        migrations.CreateModel(
            name="HousewarmingSettings",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("date_label", models.CharField(blank=True, max_length=255)),
                ("time_label", models.CharField(blank=True, max_length=255)),
                ("location", models.TextField(blank=True)),
                ("details", models.TextField(blank=True)),
                ("invite_token_hash", models.CharField(blank=True, max_length=64)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name_plural": "Housewarming settings",
            },
        ),
    ]
