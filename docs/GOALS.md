# Goals

I ultimately want to use this FireFox extension in the Zen Browser.

This extension is called "Live folders".

The concept is to support special bookmark folders that call an external API to dynamically updates the bookmarks in the applicable folder.

## Use cases

Here are two use cases:

### 1. Create a live folder for GitHub pull requests

This will initially have me login to GitHub to establish a security context.

Then, once a minute it will query the GitHub API to find all PR requests created by m or that I have been requested to review. Each pull request becomes a bookmark within the folder.

A similar feature exists for the Arc browser.

### 2. Create a live folder for Jira issues

This will initially have me login to Jira to establish a security context.

Then, once a minute it will query the Jira API to find all work items that are assigned to me. Each work item becomes a bookmark within the folder.

## Going further

The extension should be extensible so users can connect other external systems.
