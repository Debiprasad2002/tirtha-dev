import tempfile

from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.test import override_settings
from django.urls import reverse

from .models import Site, Contributor, ContributionBatch, ContributionImage


class SiteApiTests(TestCase):
	def test_site_list_returns_sites(self):
		Site.objects.create(name='Ram Mandir', latitude=26.7956, longitude=82.1947)

		response = self.client.get(reverse('site-list'))

		self.assertEqual(response.status_code, 200)
		payload = response.json()
		self.assertEqual(len(payload), 1)
		self.assertEqual(payload[0]['name'], 'Ram Mandir')
		self.assertEqual(payload[0]['latitude'], 26.7956)
		self.assertEqual(payload[0]['longitude'], 82.1947)

	@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
	def test_site_stats_returns_contribution_summary(self):
		site = Site.objects.create(name='Ram Mandir', latitude=26.7956, longitude=82.1947)
		contributor1 = Contributor.objects.create(name='Debiprasad', email='debi@example.com', is_active=True, is_banned=False)
		contributor2 = Contributor.objects.create(name='User 2', email='user2@example.com', is_active=True, is_banned=False)
		contributor3 = Contributor.objects.create(name='User 3', email='user3@example.com', is_active=True, is_banned=False)

		batch1 = ContributionBatch.objects.create(site=site, contributor=contributor1, total_images=2, status=ContributionBatch.Status.COMPLETED)
		batch2 = ContributionBatch.objects.create(site=site, contributor=contributor2, total_images=1, status=ContributionBatch.Status.COMPLETED)
		batch3 = ContributionBatch.objects.create(site=site, contributor=contributor3, total_images=3, status=ContributionBatch.Status.COMPLETED)

		for idx in range(2):
			ContributionImage.objects.create(
				batch=batch1,
				site=site,
				image=SimpleUploadedFile(f'debi_{idx}.png', b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\x0cIDAT\x08\xd7c\xf8\xff\xff?\x00\x05\xfe\x02\xfeA\xb4\x1a\x9d\x00\x00\x00\x00IEND\xaeB`\x82', content_type='image/png'),
			)
		ContributionImage.objects.create(
			batch=batch2,
			site=site,
			image=SimpleUploadedFile('user2.png', b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\x0cIDAT\x08\xd7c\xf8\xff\xff?\x00\x05\xfe\x02\xfeA\xb4\x1a\x9d\x00\x00\x00\x00IEND\xaeB`\x82', content_type='image/png'),
		)
		for idx in range(3):
			ContributionImage.objects.create(
				batch=batch3,
				site=site,
				image=SimpleUploadedFile(f'user3_{idx}.png', b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\x0cIDAT\x08\xd7c\xf8\xff\xff?\x00\x05\xfe\x02\xfeA\xb4\x1a\x9d\x00\x00\x00\x00IEND\xaeB`\x82', content_type='image/png'),
			)

		response = self.client.get(reverse('site-stats', args=[site.id]))

		self.assertEqual(response.status_code, 200)
		payload = response.json()
		self.assertEqual(payload['total_images'], 6)
		self.assertEqual(payload['total_contributors'], 3)
		self.assertEqual(len(payload['top_contributors']), 3)
		self.assertEqual(payload['top_contributors'][0]['name'], 'User 3')
		self.assertEqual(payload['top_contributors'][0]['uploads'], 3)
		self.assertEqual(payload['top_contributors'][1]['name'], 'Debiprasad')
		self.assertEqual(payload['top_contributors'][2]['name'], 'User 2')


class ContributorEmailSignalTests(TestCase):
	@patch('sites.signals.send_contributor_approval_email')
	def test_approval_email_sends_only_when_leaving_pending(self, mock_send_email):
		contributor = Contributor.objects.create(
			name='Debi',
			email='debi@example.com',
			is_active=False,
			is_banned=False,
		)

		contributor.is_active = True
		contributor.save(update_fields=['is_active'])

		mock_send_email.assert_called_once_with(contributor)

		mock_send_email.reset_mock()
		contributor.name = 'Debi Prasad'
		contributor.save(update_fields=['name'])
		mock_send_email.assert_not_called()

	@patch('sites.signals.send_contributor_rejection_email')
	def test_rejection_email_sends_only_when_leaving_pending(self, mock_send_email):
		contributor = Contributor.objects.create(
			name='Debi',
			email='debi2@example.com',
			is_active=False,
			is_banned=False,
		)

		contributor.is_banned = True
		contributor.save(update_fields=['is_banned'])

		mock_send_email.assert_called_once_with(contributor)


class ContributionUploadApiTests(TestCase):
	def setUp(self):
		self.site = Site.objects.create(name='Ram Mandir', latitude=26.7956, longitude=82.1947)
		self.contributor = Contributor.objects.create(
			name='Debi',
			email='debi-upload@example.com',
			is_active=True,
			is_banned=False,
		)
		session = self.client.session
		session['contributor_email'] = self.contributor.email
		session.save()

	def _make_image(self, name):
		png_bytes = (
			b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01'
			b'\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc```\x00\x00'
			b'\x00\x04\x00\x01\xf6\x178U\x00\x00\x00\x00IEND\xaeB`\x82'
		)
		return SimpleUploadedFile(name, png_bytes, content_type='image/png')

	@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
	def test_upload_creates_batch_and_images(self):
		response = self.client.post(
			reverse('contribution-upload'),
			{
				'site_id': str(self.site.id),
				'images': [self._make_image('ram1.png'), self._make_image('ram2.png')],
			},
		)

		self.assertEqual(response.status_code, 201)
		payload = response.json()
		self.assertEqual(payload['status'], 'success')
		self.assertEqual(payload['batch']['total_images'], 2)
		self.assertEqual(ContributionBatch.objects.count(), 1)
		batch = ContributionBatch.objects.get()
		self.assertEqual(batch.site, self.site)
		self.assertEqual(batch.contributor, self.contributor)
		self.assertEqual(batch.total_images, 2)
		self.assertEqual(batch.status, ContributionBatch.Status.COMPLETED)
		self.assertEqual(ContributionImage.objects.filter(batch=batch).count(), 2)

	@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
	def test_upload_rejects_banned_contributor(self):
		self.contributor.is_banned = True
		self.contributor.save(update_fields=['is_banned'])

		response = self.client.post(
			reverse('contribution-upload'),
			{
				'site_id': str(self.site.id),
				'images': [self._make_image('ram1.png')],
			},
		)

		self.assertEqual(response.status_code, 403)
		self.assertEqual(ContributionBatch.objects.count(), 0)

	def _make_heif_image(self, name, size=(100, 100)):
		from PIL import Image
		from pillow_heif import register_heif_opener
		import io
		register_heif_opener()
		img = Image.new('RGB', size)
		buf = io.BytesIO()
		img.save(buf, format='HEIF')
		return SimpleUploadedFile(name, buf.getvalue(), content_type='image/heic')

	@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
	def test_upload_converts_heif_file(self):
		heic_file = self._make_heif_image('photo.heic')
		response = self.client.post(
			reverse('contribution-upload'),
			{
				'site_id': str(self.site.id),
				'images': [heic_file],
			},
		)

		self.assertEqual(response.status_code, 201)
		payload = response.json()
		self.assertEqual(payload['status'], 'success')
		
		self.assertEqual(ContributionImage.objects.count(), 1)
		c_img = ContributionImage.objects.get()
		self.assertTrue(c_img.image.name.endswith('.jpg'))
		
		from PIL import Image
		with Image.open(c_img.image.path) as opened_img:
			self.assertEqual(opened_img.format, 'JPEG')
			self.assertEqual(opened_img.size, (100, 100))

	@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
	def test_upload_resizes_large_heif_file(self):
		heic_file = self._make_heif_image('large_photo.heic', size=(5000, 1000))
		response = self.client.post(
			reverse('contribution-upload'),
			{
				'site_id': str(self.site.id),
				'images': [heic_file],
			},
		)

		self.assertEqual(response.status_code, 201)
		payload = response.json()
		self.assertEqual(payload['status'], 'success')
		
		self.assertEqual(ContributionImage.objects.count(), 1)
		c_img = ContributionImage.objects.get()
		self.assertTrue(c_img.image.name.endswith('.jpg'))
		
		from PIL import Image
		with Image.open(c_img.image.path) as opened_img:
			self.assertEqual(opened_img.format, 'JPEG')
			self.assertEqual(opened_img.size, (4096, 819))

	@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
	def test_upload_valid_video(self):
		video_file = SimpleUploadedFile('test.mp4', b'fake video bytes', content_type='video/mp4')
		response = self.client.post(
			reverse('contribution-upload'),
			{
				'site_id': str(self.site.id),
				'images': [video_file],
			},
		)

		self.assertEqual(response.status_code, 201)
		payload = response.json()
		self.assertEqual(payload['status'], 'success')
		self.assertEqual(payload['batch']['total_images'], 1)
		
		self.assertEqual(ContributionImage.objects.count(), 1)
		c_img = ContributionImage.objects.get()
		self.assertEqual(c_img.file_type, 'video')
		self.assertTrue(c_img.image.name.endswith('.mp4'))
		self.assertIsNone(c_img.gps_latitude)
		self.assertIsNone(c_img.camera_make)
		
		self.assertEqual(payload['images'][0]['file_type'], 'video')
		self.assertIsNone(payload['images'][0]['metadata']['camera_make'])

	@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
	def test_upload_invalid_video_mime(self):
		video_file = SimpleUploadedFile('test.mp4', b'fake video bytes', content_type='text/plain')
		response = self.client.post(
			reverse('contribution-upload'),
			{
				'site_id': str(self.site.id),
				'images': [video_file],
			},
		)

		self.assertEqual(response.status_code, 400)
		payload = response.json()
		self.assertEqual(payload['status'], 'error')
		self.assertIn('MIME type', payload['message'])

	@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
	def test_upload_invalid_video_extension(self):
		video_file = SimpleUploadedFile('test.avi', b'fake video bytes', content_type='video/avi')
		response = self.client.post(
			reverse('contribution-upload'),
			{
				'site_id': str(self.site.id),
				'images': [video_file],
			},
		)

		self.assertEqual(response.status_code, 400)
		payload = response.json()
		self.assertEqual(payload['status'], 'error')
		self.assertIn('Only image files can be uploaded', payload['message'])

	@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
	def test_upload_oversized_video(self):
		large_bytes = b'0' * (10 * 1024 * 1024 + 1024)
		video_file = SimpleUploadedFile('test.mp4', large_bytes, content_type='video/mp4')
		response = self.client.post(
			reverse('contribution-upload'),
			{
				'site_id': str(self.site.id),
				'images': [video_file],
			},
		)

		self.assertEqual(response.status_code, 400)
		payload = response.json()
		self.assertEqual(payload['status'], 'error')
		self.assertIn('10 MB or smaller', payload['message'])

