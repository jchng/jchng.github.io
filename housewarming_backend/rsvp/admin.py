from django.contrib import admin

from .models import Rsvp


@admin.register(Rsvp)
class RsvpAdmin(admin.ModelAdmin):
    list_display = ("name", "attendance_status", "email", "arrival_time", "likely_late", "potluck_item", "updated_at", "notes")
    search_fields = ("name", "email", "potluck_item", "notes")
    list_filter = ("attendance_status", "likely_late")
