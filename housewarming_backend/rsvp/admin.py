from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from django.conf import settings
from django.contrib import admin, messages
from django.http import HttpResponseRedirect
from django.urls import reverse
from django.utils.html import format_html

from .models import Event, Rsvp


@admin.register(Rsvp)
class RsvpAdmin(admin.ModelAdmin):
    list_display = ("name", "event", "attendance_status", "email", "arrival_time", "likely_late", "potluck_item", "updated_at", "notes")
    search_fields = ("name", "email", "potluck_item", "notes", "event__title", "event__slug")
    list_filter = ("event", "attendance_status", "likely_late")


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    change_form_template = "admin/rsvp/event/change_form.html"
    list_display = ("title", "slug", "updated_at", "created_at")
    search_fields = ("title", "slug", "location", "details")
    fieldsets = (
        (
            "Event",
            {
                "fields": ("title", "slug", "public_blurb", "date_label", "time_label", "location", "details"),
            },
        ),
        (
            "Invite access",
            {
                "fields": ("invite_link_help", "created_at", "updated_at"),
            },
        ),
    )
    readonly_fields = ("invite_link_help", "created_at", "updated_at")

    def has_delete_permission(self, request, obj=None):
        return False

    def invite_link_help(self, obj):
        if not obj or not obj.pk or not obj.invite_token_hash:
            return "No invite token has been generated yet."

        return format_html(
            "The raw invite URL is only shown once when you generate it. Base page: <code>{}</code>",
            settings.EVENT_FRONTEND_URL,
        )

    invite_link_help.short_description = "Invite link status"

    def response_change(self, request, obj):
        if "_generate_invite_link" in request.POST:
            raw_token = obj.rotate_invite_token()
            invite_url = self.build_invite_url(raw_token)
            self.message_user(
                request,
                format_html(
                    'New invite link generated. Copy it now: <a href="{0}" target="_blank" rel="noreferrer">{0}</a>',
                    invite_url,
                ),
                level=messages.SUCCESS,
            )
            return HttpResponseRedirect(
                reverse("admin:rsvp_event_change", args=[obj.pk])
            )

        return super().response_change(request, obj)

    def build_invite_url(self, raw_token):
        frontend_url = settings.EVENT_FRONTEND_URL
        parts = urlsplit(frontend_url)
        query_pairs = [(key, value) for key, value in parse_qsl(parts.query, keep_blank_values=True) if key != "t"]
        return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(query_pairs), raw_token))
