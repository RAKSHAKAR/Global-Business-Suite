# Global Business Suite (GBS) — Enterprise SDK Guide

## Official SDK Packages

GBS provides native SDKs for all major software ecosystems:

| Language / Framework | Package Name | Installation Command |
|---|---|---|
| JavaScript / TypeScript | `@gbs/sdk-js` | `npm install @gbs/sdk-js` |
| Python | `gbs-sdk-python` | `pip install gbs-sdk-python` |
| React Native / Expo | `@gbs/sdk-react-native` | `npm install @gbs/sdk-react-native` |
| Flutter | `gbs_flutter_sdk` | `flutter pub add gbs_flutter_sdk` |
| Go | `github.com/gbs/sdk-go` | `go get github.com/gbs/sdk-go` |
| Java / Spring Boot | `com.gbs:gbs-sdk-java` | `implementation 'com.gbs:gbs-sdk-java:1.0.0'` |
| .NET / C# | `Gbs.Sdk.DotNet` | `dotnet add package Gbs.Sdk.DotNet` |
| PHP / Laravel | `gbs/sdk-php` | `composer require gbs/sdk-php` |

## Quick Start Example (TypeScript)

```typescript
import { GbsClient } from '@gbs/sdk-js';

const gbs = new GbsClient({
  apiKey: process.env.GBS_API_KEY,
  tenantId: 'tenant-123',
});

// Query CRM Leads
const leads = await gbs.crm.leads.list({ status: 'QUALIFIED' });

// Interact with Unified AI Copilot
const reply = await gbs.ai.copilot.query({
  roleContext: 'FINANCE',
  prompt: 'Summarize Q3 MRR growth and active churn risk',
});
```
