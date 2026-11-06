# Demo content (T-215, D-034)

The live site shows a small set of demo rooms so visitors can try it. Everything here is fictional,
and every listing says so in its description.

## What gets loaded

| Listing | Neighborhood | Rent | Landlord |
| --- | --- | --- | --- |
| Bright room off Pine, 5 min to the station | Capitol Hill | $1,450 | Grace |
| Studio with a real kitchen near the Ave | University District | $1,580 | Grace |
| Attic room with a desk, quiet street | Roosevelt | $1,120 | Daniel |
| Room near Columbia City station, parking spot | Columbia City | $980 | Daniel |
| Cozy room with a view of the hill | Beacon Hill | $1,050 | Priya |
| Minimal room in a shared Ballard house | Ballard | $1,180 | Priya |
| Private bath room in Fremont | Fremont | $1,320 | Grace |
| Spacious room close to Northgate station | Northgate | $1,100 | Daniel |

Accounts: three demo landlords (`grace.demo@example.com`, `daniel.demo@example.com`,
`priya.demo@example.com`) and one demo tenant (`sam.demo@example.com`). Phone numbers are
(206) 555-01xx, which are reserved for fiction. Addresses are a street and a cross street, never a
house number.

The data lives in `scripts/demo-data/demo-data.json`. It holds **no passwords**.

## How to load it

### On the live site (needs Khai's approval each time)

1. One time: GitHub → repository Settings → Secrets and variables → Actions → New repository
   secret. Name `DEMO_PASSWORD`, value: a new password of 12 to 72 characters that you keep in your
   password manager. Do not paste it in chat, the repository, or a screenshot.
2. Actions → **demo-data** → Run workflow, with the Render URL
   (`https://finding-house.onrender.com`).
3. The workflow wakes the API, checks every photo link answers with an image, then registers the
   accounts and posts the listings through the public API. Running it again creates nothing new.

To log in as a demo landlord, use one of the emails above and the `DEMO_PASSWORD` value.

### Locally or in CI

```bash
DEMO_PASSWORD="$(openssl rand -hex 16)" \
  python3 scripts/demo-data/load_demo_data.py --base-url http://localhost:8080 --check-images
```

The `smoke` workflow does this on every push with a throwaway password, loads it twice to show it
creates no duplicates, and screenshots the pages with the photos (`D1`–`D3`).

## Removing it

Log in as each demo landlord and delete the listings from **My listings** (FR-07). The accounts
stay; nothing else refers to them.

## Photo credits

All photos are from [Unsplash](https://unsplash.com) under the
[Unsplash License](https://unsplash.com/license): free to use, including commercially, without
asking; credit is not required but appreciated, so it is given here. Each photo was checked on
2026-11-06 on its own page: it says "Free to use under the Unsplash License" (not the paid
Unsplash+ license) and shows no recognizable people or logos. The site loads them from
`images.unsplash.com`.

| Photo | Photographer | License |
| --- | --- | --- |
| [free3W2D_Ms](https://unsplash.com/photos/free3W2D_Ms) | Luisa Brimble | Unsplash License |
| [r8i3RwrVcRk](https://unsplash.com/photos/r8i3RwrVcRk) | Clay Banks | Unsplash License |
| [NhNccu6YZAE](https://unsplash.com/photos/NhNccu6YZAE) | Kirsten Miles | Unsplash License |
| [T6WRDVQBn8M](https://unsplash.com/photos/T6WRDVQBn8M) | Wes Hicks | Unsplash License |
| [DoTKoAC5hqg](https://unsplash.com/photos/DoTKoAC5hqg) | Matthieu Lemarchal | Unsplash License |
| [lnEtS2RnS4A](https://unsplash.com/photos/lnEtS2RnS4A) | Ömürden Cengiz | Unsplash License |
| [xRjXFJmWlbA](https://unsplash.com/photos/xRjXFJmWlbA) | Thomas Heath | Unsplash License |
| [3oyeaivM_fE](https://unsplash.com/photos/3oyeaivM_fE) | Quin Stevenson | Unsplash License |
| [HiQxzJy1e8w](https://unsplash.com/photos/HiQxzJy1e8w) | Andrew Kayani | Unsplash License |
| [bYWnQN-6um0](https://unsplash.com/photos/bYWnQN-6um0) | Huy Phan | Unsplash License |
| [TkprGwygO5Q](https://unsplash.com/photos/TkprGwygO5Q) | Point3D Commercial Imaging Ltd. | Unsplash License |
| [39uhKdbWPGA](https://unsplash.com/photos/39uhKdbWPGA) | Meg Jenson | Unsplash License |
| [avPVKD07Fcg](https://unsplash.com/photos/avPVKD07Fcg) | Clay Banks | Unsplash License |
| [OLtzoieKmQs](https://unsplash.com/photos/OLtzoieKmQs) | Erika Mendes | Unsplash License |
| [vwCEyRG1w00](https://unsplash.com/photos/vwCEyRG1w00) | Point3D Commercial Imaging Ltd. | Unsplash License |
| [puEH-81OV50](https://unsplash.com/photos/puEH-81OV50) | Interial Co. | Unsplash License |
