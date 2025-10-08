# Learnings

## Browser extensions

Browser extensions follow a specification of either manifest v2 (MV2) or manifest v3 (MV3)

### What are MV2 and MV3?

* **MV2** is the older Chrome extension manifest specification used for many years, allowing e.g. long-lived background pages, full control via the webRequest API (including blocking requests), and more flexible behaviors.
* **MV3** is the newer specification introduced by Chromium/Google to improve security, privacy, and performance, by restricting certain APIs, replacing background pages with service workers, disallowing remotely hosted code, and introducing the declarativeNetRequest API for network filtering instead of full webRequest blocking.

### Browser support (as of 2025)

* **Chrome & Edge:** MV2 (Manifest V2) extensions are being fully removed. MV3 is now required.
* **Firefox**: Continues to support both MV2 and MV3, with a more flexible MV3 implementation than Chrome’s.
* **Opera**: Still supports MV2 for now, but plans to transition to MV3 later.
* **Brave**: Officially supports MV3 but aims to keep MV2 working for certain privacy/ad-blocking extensions as long as possible.

### Bottom line

MV3 is the future standard across browsers, but only Firefox (and partly Brave/Opera) still allow MV2 extensions at this point.
