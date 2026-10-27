# Vehicle Parking Location Management

A responsive browser app for vehicle assignments, parking bays, reservations, movements, and road tests.

## Run locally

```sh
cd apps/vehicle-parking-location-management
npm ci
npm run dev
```

## Data and access

This fresh deployment stores operational data in the current browser only. It has no sign-in, shared database, or cloud synchronization; browser profiles do not share data, and clearing browser storage deletes it. Do not enter sensitive or production data. Supabase has not been configured.

## Publish on GitHub Pages

The `Publish website` workflow builds the app and deploys it to GitHub Pages on pushes to `main`. In the repository's **Settings → Pages**, choose **GitHub Actions** as the build and deployment source. The deployed address will be `https://anooptl01a-svg.github.io/VPLM/`.

The public repository makes the source visible to everyone. Enable Supabase authentication, database policies, and shared persistence before using this for real operations or sensitive records.
