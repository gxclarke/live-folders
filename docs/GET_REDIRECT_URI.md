# Getting Your Extension's Redirect URI

When setting up OAuth for GitHub or Jira, you need to get your extension's redirect URI. Here's how to do it correctly.

## Quick Steps

1. **Build your extension:**

   ```bash
   npm run build
   ```

2. **Load the extension in Chrome:**
   - Go to `chrome://extensions`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the `dist` folder

3. **Open the extension popup:**
   - Click the extension icon in your Chrome toolbar
   - You should see the Live Folders popup

4. **Open DevTools on the popup:**
   - **Right-click anywhere in the popup window**
   - Select **"Inspect"** from the context menu
   - DevTools will open (it should be focused on the popup's context)

5. **Run the command in the console:**

   For GitHub:

   ```javascript
   chrome.identity.getRedirectURL("github")
   ```

   For Jira:

   ```javascript
   chrome.identity.getRedirectURL("jira")
   ```

6. **Copy the result:**
   - The console will output something like: `"https://abcdefghijklmnop.chromiumapp.org/github"`
   - Copy this entire URL (without the quotes)

7. **Use it in your OAuth App settings:**
   - GitHub: Paste into "Authorization callback URL"
   - Jira: Paste into "Callback URL"

## Common Mistakes

### ❌ Opening DevTools on the wrong page

**Wrong:**

- Opening DevTools on a regular webpage (like github.com)
- Using F12 on the main browser window

**Why it fails:**

```javascript
// In regular webpage console:
chrome.identity.getRedirectURL("github")
// ❌ Uncaught ReferenceError: chrome is not defined
```

or

```javascript
browser.identity.getRedirectURL("github")
// ❌ Uncaught ReferenceError: browser is not defined
```

**Right:**

- Right-click **on the extension popup itself**
- Select "Inspect" to open DevTools for the popup
- The `chrome.identity` API is available in extension contexts only

### ❌ Using `browser` instead of `chrome`

In the DevTools console, use `chrome.identity`, not `browser.identity`:

```javascript
// ✅ Correct
chrome.identity.getRedirectURL("github")

// ❌ Won't work in Chrome DevTools console
browser.identity.getRedirectURL("github")
```

(Note: `browser` is used in the source code because of the WebExtension polyfill, but in the console, use `chrome` directly)

### ❌ Extension not loaded

Make sure:

- You've built the extension (`npm run build`)
- You've loaded it in Chrome (`chrome://extensions` → Load unpacked → select `dist`)
- The extension icon appears in your toolbar

## Troubleshooting

### "Cannot read properties of undefined"

**Symptom:**

```javascript
chrome.identity.getRedirectURL("github")
// ❌ Uncaught TypeError: Cannot read properties of undefined
```

**Cause:** DevTools is not in the extension's context.

**Solution:** Make sure you right-clicked on the popup/sidepanel itself, not a webpage.

### Different Extension ID Each Time

**Why it happens:**

- Unpacked extensions get a new ID each time you reload them
- The ID changes if you modify the extension's folder path

**What to do:**

- For development: Accept that the ID will change
- Update your OAuth App callback URL when it changes
- For production: The Web Store assigns a permanent ID

### Finding the Extension ID

The redirect URI contains your extension ID:

```text
https://EXTENSION_ID_HERE.chromiumapp.org/github
        ^^^^^^^^^^^^^^^^
        This is your extension ID
```

You can also find it:

- In `chrome://extensions` (look under the extension name)
- In the redirect URI itself

## Alternative Method: Check in Background Service Worker

If you're having trouble with the popup, you can also get the redirect URI from the background service worker:

1. Go to `chrome://extensions`
2. Find your extension
3. Click "service worker" link (under "Inspect views")
4. In the console that opens, run:

   ```javascript
   chrome.identity.getRedirectURL("github")
   ```

This works because the background service worker is also an extension context.

## For Production (After Publishing)

When you publish to the Chrome Web Store:

1. The extension gets a **permanent ID**
2. The redirect URI will be different from development
3. You'll need to:
   - Create a **new** OAuth App (or update the existing one)
   - Use the production redirect URI
   - Keep the dev OAuth App for development

## Summary

**Key Points:**

- ✅ Must inspect the extension popup/sidepanel, not a webpage
- ✅ Use `chrome.identity` not `browser.identity` in console
- ✅ Use `getRedirectURL("github")` or `getRedirectURL("jira")`
- ✅ Copy the entire URL including the protocol
- ✅ Paste into OAuth App settings (Authorization callback URL)

**The redirect URI format:**

```text
https://<extension-id>.chromiumapp.org/<provider>
```

Where:

- `<extension-id>` = Your extension's unique ID
- `<provider>` = "github" or "jira" (matches the parameter you pass)

Now you're ready to set up OAuth! 🚀
