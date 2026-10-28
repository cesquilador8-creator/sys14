# Managed Browser Policies

## Chrome enterprise policy

Use the Chrome enterprise policy to disable Incognito mode on managed company devices:

```json
{
  "IncognitoModeAvailability": 0
}
```

This restricts private browsing for managed Chrome deployments and should be enforced through the company's Chrome enterprise management platform.

## Microsoft Edge policy

Use the Edge policy to disable InPrivate browsing on managed devices:

```json
{
  "InPrivateModeAvailability": 0
}
```

This setting is supported via Edge enterprise policy and must be deployed through the company's device management tooling.

## Extension deployment notes

- Install the extension as a managed enterprise package or via browser policy.
- Grant the extension the required permissions for storage, tabs, and blocking features.
- Use a company-approved deployment method so the extension is installed only on managed employee laptops.
- Document the difference between browser policy decisions and extension enforcement; the extension cannot bypass browser security controls on unmanaged contexts.

## Caveats

The extension cannot universally enforce blocking in every browser context, including unmanaged browsers or contexts outside the supported managed-browser configuration. For Incognito or InPrivate mode, company IT must deploy the supported browser policy and verify it in the controlled managed environment.
