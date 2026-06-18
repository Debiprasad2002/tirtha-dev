import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from sites.models import Site

initial_sites = [
    {
        "name": "Shri Tukai Mata Temple",
        "latitude": 18.3533,
        "longitude": 73.8344,
        "description": "Sacred meditation center located near Pune, Maharashtra.",
        "details": "This temple is dedicated to Goddess Tukai. It is set on a hill, providing a serene environment for meditation and prayer. Visitors experience peace and spiritual rejuvenation here.",
        "state": "Maharashtra",
        "country": "India",
    },
    {
        "name": "Khandoba Temple Akurdi",
        "latitude": 18.6471,
        "longitude": 73.7801,
        "description": "Ancient temple complex in Akurdi, Pune.",
        "details": "Dedicated to Lord Khandoba, a manifestation of Lord Shiva. The temple attracts many devotees during festivals and is known for its beautiful architecture and cultural heritage.",
        "state": "Maharashtra",
        "country": "India",
    },
    {
        "name": "Sri Bhoga Nandhiswara Temple",
        "latitude": 13.3768,
        "longitude": 77.7019,
        "description": "Spiritual heritage site at the foot of Nandi Hills near Bengaluru.",
        "details": "Dating back to the 9th century, this temple complex features incredible Dravidian architecture. It is dedicated to Shiva and contains two main shrines, Bhoga Nandeeshwara and Arunachaleshwara.",
        "state": "Karnataka",
        "country": "India",
    },
    {
        "name": "Siddheshwar Temple Solapur",
        "latitude": 17.6599,
        "longitude": 75.9064,
        "description": "Historical temple in the middle of a lake in Solapur.",
        "details": "Dedicated to Lord Siddheshwar (Shiva). The temple is unique as it is located in the middle of a lake and is highly revered by people of Maharashtra and Karnataka. A major annual fair (Yatra) is held here in January.",
        "state": "Maharashtra",
        "country": "India",
    },
    {
        "name": "Sri Khandoba Temple Bale",
        "latitude": 17.6974,
        "longitude": 75.8672,
        "description": "Devotional center on the outskirts of Solapur.",
        "details": "A prominent religious site for regional devotees of Khandoba. The temple offers a peaceful setting for worship and houses traditional shrines.",
        "state": "Maharashtra",
        "country": "India",
    },
    {
        "name": "Gopeshwar Temple",
        "latitude": 30.4181,
        "longitude": 79.3248,
        "description": "Ancient spiritual site in Gopeshwar, Uttarakhand.",
        "details": "An ancient stone temple dedicated to Lord Shiva, located in the scenic hills of Chamoli district. It features a historic trident (Trishul) made of iron and copper, with inscriptions dating back centuries.",
        "state": "Uttarakhand",
        "country": "India",
    },
    {
        "name": "Parvati Temple",
        "latitude": 18.4975,
        "longitude": 73.8475,
        "description": "Sacred shrine on Parvati Hill in Pune.",
        "details": "Built during the Peshwa dynasty, this temple sits atop a scenic hill in Pune. It is one of the oldest heritage structures in Pune, offering panoramic views of the city below.",
        "state": "Maharashtra",
        "country": "India",
    }
]

print("Seeding sites database...")
for site_data in initial_sites:
    site, created = Site.objects.get_or_create(
        name=site_data["name"],
        defaults=site_data
    )
    if created:
        print(f"Created site: {site.name}")
    else:
        print(f"Site already exists: {site.name}")

print("Seeding complete!")
