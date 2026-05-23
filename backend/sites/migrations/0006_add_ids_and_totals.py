from django.db import migrations, models
import uuid
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ("sites", "0005_contributionbatch_contributionimage"),
    ]

    operations = [
        # Site additions (add nullable first)
        migrations.AddField(
            model_name="site",
            name="site_id",
            field=models.UUIDField(null=True, editable=False),
        ),
        migrations.AddField(
            model_name="site",
            name="state",
            field=models.CharField(max_length=128, null=True, blank=True),
        ),
        migrations.AddField(
            model_name="site",
            name="country",
            field=models.CharField(max_length=128, null=True, blank=True),
        ),
        migrations.AddField(
            model_name="site",
            name="total_images",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="site",
            name="created_at",
            field=models.DateTimeField(default=django.utils.timezone.now, auto_now_add=True),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="site",
            name="updated_at",
            field=models.DateTimeField(default=django.utils.timezone.now, auto_now=True),
            preserve_default=False,
        ),

        # Contributor additions
        migrations.AddField(
            model_name="contributor",
            name="contributor_id",
            field=models.UUIDField(null=True, editable=False),
        ),
        migrations.AddField(
            model_name="contributor",
            name="total_uploads",
            field=models.PositiveIntegerField(default=0),
        ),

        # ContributionBatch additions
        migrations.AddField(
            model_name="contributionbatch",
            name="batch_id",
            field=models.UUIDField(null=True, editable=False),
        ),

        # ContributionImage additions
        migrations.AddField(
            model_name="contributionimage",
            name="image_id",
            field=models.UUIDField(null=True, editable=False),
        ),
        # Populate UUIDs for existing rows and make fields non-null + unique
        migrations.RunPython(
            code=lambda apps, schema_editor: (
                __import__('uuid'),
                [
                    (apps.get_model('sites', 'Site'), 'site_id'),
                    (apps.get_model('sites', 'Contributor'), 'contributor_id'),
                    (apps.get_model('sites', 'ContributionBatch'), 'batch_id'),
                    (apps.get_model('sites', 'ContributionImage'), 'image_id'),
                ],
            ) and None,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.RunPython(
            code=lambda apps, schema_editor: (
                _populate_uuids(apps),
            ),
            reverse_code=migrations.RunPython.noop,
        ),
        # Alter fields to be non-null and unique
        migrations.AlterField(
            model_name='site',
            name='site_id',
            field=models.UUIDField(unique=True, editable=False),
        ),
        migrations.AlterField(
            model_name='contributor',
            name='contributor_id',
            field=models.UUIDField(unique=True, editable=False),
        ),
        migrations.AlterField(
            model_name='contributionbatch',
            name='batch_id',
            field=models.UUIDField(unique=True, editable=False),
        ),
        migrations.AlterField(
            model_name='contributionimage',
            name='image_id',
            field=models.UUIDField(unique=True, editable=False),
        ),
    ]


def _populate_uuids(apps):
    import uuid
    Site = apps.get_model('sites', 'Site')
    Contributor = apps.get_model('sites', 'Contributor')
    ContributionBatch = apps.get_model('sites', 'ContributionBatch')
    ContributionImage = apps.get_model('sites', 'ContributionImage')

    for model, field in [(Site, 'site_id'), (Contributor, 'contributor_id'), (ContributionBatch, 'batch_id'), (ContributionImage, 'image_id')]:
        objs = model.objects.all()
        for obj in objs:
            if getattr(obj, field) in (None, ''):
                setattr(obj, field, uuid.uuid4())
                obj.save(update_fields=[field])
