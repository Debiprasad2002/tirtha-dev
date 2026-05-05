from django.db import models


class Site(models.Model):
    name = models.CharField(max_length=255)
    latitude = models.FloatField()
    longitude = models.FloatField()
    description = models.TextField(blank=True, null=True)
    details = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name