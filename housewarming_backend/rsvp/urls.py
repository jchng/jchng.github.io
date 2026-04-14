from django.urls import path

from . import views

urlpatterns = [
    path("event-details/", views.event_details, name="event-details"),
    path("rsvps/", views.rsvp_list, name="rsvp-list"),
    path("rsvps/<int:rsvp_id>/", views.rsvp_detail, name="rsvp-detail"),
    path("rsvps/lookup/", views.lookup, name="rsvp-lookup"),
    path("rsvps/summary/", views.summary, name="rsvp-summary"),
]
