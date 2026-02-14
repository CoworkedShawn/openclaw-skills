#!/usr/bin/env node
/**
 * Facebook Page CLI
 * Commands for managing Facebook Pages via Graph API
 */

import { program } from "commander";
import { readFileSync, existsSync } from "fs";
import { dirname, join, basename } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import { Blob } from "buffer";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = join(__dirname, "..");
const ENV_FILE = join(SKILL_DIR, ".env");
const TOKENS_FILE = join(SKILL_DIR, "tokens.json");

// Load .env from skill directory
config({ path: ENV_FILE });

const GRAPH_API_VERSION = "v21.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

function loadTokens() {
  if (!existsSync(TOKENS_FILE)) {
    console.error(`Error: No tokens found at ${TOKENS_FILE}`);
    console.error("Run: node auth.js login");
    process.exit(1);
  }
  return JSON.parse(readFileSync(TOKENS_FILE, "utf-8"));
}

function getPageToken(tokens, pageId) {
  const pages = tokens.pages || {};
  if (!pages[pageId]) {
    console.error(`Error: Page ${pageId} not found in tokens`);
    console.error("Available pages:");
    for (const [pid, pinfo] of Object.entries(pages)) {
      console.log(`  ${pid}: ${pinfo.name}`);
    }
    process.exit(1);
  }
  return pages[pageId].token;
}

async function apiGet(endpoint, token, params = {}) {
  const url = new URL(`${GRAPH_API_BASE}/${endpoint}`);
  url.searchParams.set("access_token", token);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  
  const resp = await fetch(url);
  const data = await resp.json();
  if (!resp.ok) {
    console.error(`API Error: ${resp.status}`);
    console.error(JSON.stringify(data, null, 2));
    process.exit(1);
  }
  return data;
}

async function apiPost(endpoint, token, body = {}) {
  const url = new URL(`${GRAPH_API_BASE}/${endpoint}`);
  url.searchParams.set("access_token", token);
  
  const formData = new URLSearchParams();
  for (const [k, v] of Object.entries(body)) {
    formData.set(k, v);
  }
  
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData,
  });
  
  const data = await resp.json();
  if (!resp.ok) {
    console.error(`API Error: ${resp.status}`);
    console.error(JSON.stringify(data, null, 2));
    process.exit(1);
  }
  return data;
}

async function apiPostMultipart(endpoint, token, fields, filePath) {
  const url = new URL(`${GRAPH_API_BASE}/${endpoint}`);
  url.searchParams.set("access_token", token);
  
  const fileBuffer = readFileSync(filePath);
  const formData = new FormData();
  
  for (const [k, v] of Object.entries(fields)) {
    formData.set(k, v);
  }
  
  formData.set("source", new Blob([fileBuffer]), basename(filePath));
  
  const resp = await fetch(url, {
    method: "POST",
    body: formData,
  });
  
  const data = await resp.json();
  if (!resp.ok) {
    console.error(`API Error: ${resp.status}`);
    console.error(JSON.stringify(data, null, 2));
    process.exit(1);
  }
  return data;
}

async function apiDelete(endpoint, token) {
  const url = new URL(`${GRAPH_API_BASE}/${endpoint}`);
  url.searchParams.set("access_token", token);
  
  const resp = await fetch(url, { method: "DELETE" });
  const data = await resp.json();
  if (!resp.ok) {
    console.error(`API Error: ${resp.status}`);
    console.error(JSON.stringify(data, null, 2));
    process.exit(1);
  }
  return data;
}

// ============ PAGES ============

program
  .command("pages")
  .description("List pages you manage")
  .action(() => {
    const tokens = loadTokens();
    const pages = tokens.pages || {};
    
    if (!Object.keys(pages).length) {
      console.log("No pages found");
      return;
    }
    
    console.log(`${"ID".padEnd(20)} ${"Name".padEnd(40)}`);
    console.log("-".repeat(60));
    for (const [pageId, pageInfo] of Object.entries(pages)) {
      console.log(`${pageId.padEnd(20)} ${pageInfo.name.padEnd(40)}`);
    }
  });

// ============ POSTS ============

const postCmd = program.command("post").description("Post operations");

postCmd
  .command("list")
  .description("List posts from a page")
  .requiredOption("--page <id>", "Page ID")
  .option("--limit <n>", "Number of posts", "10")
  .action(async (opts) => {
    const tokens = loadTokens();
    const pageToken = getPageToken(tokens, opts.page);
    
    const result = await apiGet(`${opts.page}/posts`, pageToken, {
      fields: "id,message,created_time,permalink_url,shares,likes.summary(true),comments.summary(true)",
      limit: opts.limit,
    });
    
    const posts = result.data || [];
    if (!posts.length) {
      console.log("No posts found");
      return;
    }
    
    for (const post of posts) {
      console.log(`\n${"=".repeat(60)}`);
      console.log(`ID: ${post.id}`);
      console.log(`Date: ${post.created_time || "N/A"}`);
      console.log(`Message: ${(post.message || "(no text)").slice(0, 100)}...`);
      const likes = post.likes?.summary?.total_count || 0;
      const comments = post.comments?.summary?.total_count || 0;
      const shares = post.shares?.count || 0;
      console.log(`Likes: ${likes} | Comments: ${comments} | Shares: ${shares}`);
      console.log(`URL: ${post.permalink_url || "N/A"}`);
    }
  });

postCmd
  .command("create")
  .description("Create a new post")
  .requiredOption("--page <id>", "Page ID")
  .option("--message <text>", "Post message")
  .option("--photo <path>", "Path to photo file")
  .option("--link <url>", "URL to share")
  .action(async (opts) => {
    const tokens = loadTokens();
    const pageToken = getPageToken(tokens, opts.page);
    
    let result;
    
    if (opts.photo) {
      // Photo post
      const fields = {};
      if (opts.message) fields.message = opts.message;
      result = await apiPostMultipart(`${opts.page}/photos`, pageToken, fields, opts.photo);
    } else if (opts.link) {
      // Link post
      const body = { link: opts.link };
      if (opts.message) body.message = opts.message;
      result = await apiPost(`${opts.page}/feed`, pageToken, body);
    } else {
      // Text post
      if (!opts.message) {
        console.error("Error: --message is required for text posts");
        process.exit(1);
      }
      result = await apiPost(`${opts.page}/feed`, pageToken, { message: opts.message });
    }
    
    console.log(`Post created! ID: ${result.id || result.post_id}`);
  });

postCmd
  .command("delete")
  .description("Delete a post")
  .requiredOption("--page <id>", "Page ID")
  .requiredOption("--post <id>", "Post ID")
  .action(async (opts) => {
    const tokens = loadTokens();
    const pageToken = getPageToken(tokens, opts.page);
    
    const result = await apiDelete(opts.post, pageToken);
    if (result.success) {
      console.log("Post deleted successfully");
    } else {
      console.log("Failed to delete post");
    }
  });

// ============ COMMENTS ============

const commentsCmd = program.command("comments").description("Comment operations");

commentsCmd
  .command("list")
  .description("List comments on a post")
  .requiredOption("--post <id>", "Post ID")
  .option("--limit <n>", "Number of comments", "25")
  .action(async (opts) => {
    const tokens = loadTokens();
    const userToken = tokens.user_token;
    
    const result = await apiGet(`${opts.post}/comments`, userToken, {
      fields: "id,message,from,created_time,like_count,is_hidden",
      limit: opts.limit,
    });
    
    const comments = result.data || [];
    if (!comments.length) {
      console.log("No comments found");
      return;
    }
    
    for (const comment of comments) {
      const hidden = comment.is_hidden ? " [HIDDEN]" : "";
      console.log(`\n${"-".repeat(40)}`);
      console.log(`ID: ${comment.id}${hidden}`);
      console.log(`From: ${comment.from?.name || "Unknown"}`);
      console.log(`Date: ${comment.created_time || "N/A"}`);
      console.log(`Likes: ${comment.like_count || 0}`);
      console.log(`Message: ${comment.message || ""}`);
    }
  });

commentsCmd
  .command("reply")
  .description("Reply to a comment")
  .requiredOption("--comment <id>", "Comment ID")
  .requiredOption("--message <text>", "Reply message")
  .action(async (opts) => {
    const tokens = loadTokens();
    const userToken = tokens.user_token;
    
    const result = await apiPost(`${opts.comment}/comments`, userToken, {
      message: opts.message,
    });
    console.log(`Reply posted! ID: ${result.id}`);
  });

commentsCmd
  .command("hide")
  .description("Hide a comment")
  .requiredOption("--comment <id>", "Comment ID")
  .action(async (opts) => {
    const tokens = loadTokens();
    const userToken = tokens.user_token;
    
    const result = await apiPost(opts.comment, userToken, { is_hidden: "true" });
    if (result.success) {
      console.log("Comment hidden successfully");
    } else {
      console.log("Failed to hide comment");
    }
  });

commentsCmd
  .command("unhide")
  .description("Unhide a comment")
  .requiredOption("--comment <id>", "Comment ID")
  .action(async (opts) => {
    const tokens = loadTokens();
    const userToken = tokens.user_token;
    
    const result = await apiPost(opts.comment, userToken, { is_hidden: "false" });
    if (result.success) {
      console.log("Comment unhidden successfully");
    } else {
      console.log("Failed to unhide comment");
    }
  });

commentsCmd
  .command("delete")
  .description("Delete a comment")
  .requiredOption("--comment <id>", "Comment ID")
  .action(async (opts) => {
    const tokens = loadTokens();
    const userToken = tokens.user_token;
    
    const result = await apiDelete(opts.comment, userToken);
    if (result.success) {
      console.log("Comment deleted successfully");
    } else {
      console.log("Failed to delete comment");
    }
  });

// ============ INSTAGRAM ============

const igCmd = program.command("instagram").alias("ig").description("Instagram operations");

igCmd
  .command("list")
  .description("List Instagram accounts linked to your pages")
  .action(() => {
    const tokens = loadTokens();
    const pages = tokens.pages || {};
    
    let found = false;
    console.log(`${"Page".padEnd(30)} ${"Instagram".padEnd(25)} ${"IG ID".padEnd(20)}`);
    console.log("-".repeat(75));
    
    for (const [pageId, pageInfo] of Object.entries(pages)) {
      if (pageInfo.instagram) {
        found = true;
        console.log(`${pageInfo.name.padEnd(30)} @${pageInfo.instagram.username.padEnd(24)} ${pageInfo.instagram.id}`);
      }
    }
    
    if (!found) {
      console.log("No Instagram accounts found linked to your pages.");
      console.log("Make sure your Instagram Business/Creator account is connected to a Facebook Page.");
    }
  });

function getInstagramAccount(tokens, identifier) {
  const pages = tokens.pages || {};
  
  // Search by IG ID, username, or page ID
  for (const [pageId, pageInfo] of Object.entries(pages)) {
    if (!pageInfo.instagram) continue;
    
    if (pageInfo.instagram.id === identifier ||
        pageInfo.instagram.username === identifier ||
        pageInfo.instagram.username === identifier.replace('@', '') ||
        pageId === identifier) {
      return { 
        igId: pageInfo.instagram.id, 
        username: pageInfo.instagram.username,
        pageToken: pageInfo.token,
        pageName: pageInfo.name
      };
    }
  }
  
  console.error(`Error: Instagram account "${identifier}" not found`);
  console.error("Available accounts:");
  for (const [pageId, pageInfo] of Object.entries(pages)) {
    if (pageInfo.instagram) {
      console.log(`  @${pageInfo.instagram.username} (ID: ${pageInfo.instagram.id})`);
    }
  }
  process.exit(1);
}

igCmd
  .command("post")
  .description("Create an Instagram post")
  .requiredOption("--account <id>", "Instagram account ID, username, or linked page ID")
  .requiredOption("--image <url>", "Public URL to image (must be accessible by Meta servers)")
  .option("--caption <text>", "Post caption")
  .option("--location <id>", "Location ID (optional)")
  .action(async (opts) => {
    const tokens = loadTokens();
    const ig = getInstagramAccount(tokens, opts.account);
    
    console.log(`Posting to @${ig.username}...`);
    
    // Step 1: Create media container
    const containerBody = {
      image_url: opts.image,
    };
    if (opts.caption) containerBody.caption = opts.caption;
    if (opts.location) containerBody.location_id = opts.location;
    
    const container = await apiPost(`${ig.igId}/media`, ig.pageToken, containerBody);
    const containerId = container.id;
    console.log(`Media container created: ${containerId}`);
    
    // Step 2: Publish
    const result = await apiPost(`${ig.igId}/media_publish`, ig.pageToken, {
      creation_id: containerId,
    });
    
    console.log(`Post published! ID: ${result.id}`);
    console.log(`View at: https://instagram.com/${ig.username}`);
  });

igCmd
  .command("video")
  .description("Create an Instagram video/reel post")
  .requiredOption("--account <id>", "Instagram account ID, username, or linked page ID")
  .requiredOption("--video <url>", "Public URL to video (must be accessible by Meta servers)")
  .option("--caption <text>", "Post caption")
  .option("--cover <url>", "Cover image URL (optional)")
  .option("--reel", "Post as Reel instead of regular video")
  .action(async (opts) => {
    const tokens = loadTokens();
    const ig = getInstagramAccount(tokens, opts.account);
    
    console.log(`Posting video to @${ig.username}...`);
    
    // Step 1: Create media container
    const containerBody = {
      video_url: opts.video,
      media_type: opts.reel ? "REELS" : "VIDEO",
    };
    if (opts.caption) containerBody.caption = opts.caption;
    if (opts.cover) containerBody.cover_url = opts.cover;
    
    const container = await apiPost(`${ig.igId}/media`, ig.pageToken, containerBody);
    const containerId = container.id;
    console.log(`Media container created: ${containerId}`);
    console.log("Waiting for video processing...");
    
    // Step 2: Poll for processing completion
    let status = "IN_PROGRESS";
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max
    
    while (status === "IN_PROGRESS" && attempts < maxAttempts) {
      await new Promise(r => setTimeout(r, 5000)); // Wait 5 seconds
      const statusResp = await apiGet(containerId, ig.pageToken, {
        fields: "status_code,status",
      });
      status = statusResp.status_code;
      attempts++;
      process.stdout.write(".");
    }
    console.log("");
    
    if (status !== "FINISHED") {
      console.error(`Video processing failed or timed out. Status: ${status}`);
      process.exit(1);
    }
    
    // Step 3: Publish
    const result = await apiPost(`${ig.igId}/media_publish`, ig.pageToken, {
      creation_id: containerId,
    });
    
    console.log(`Video published! ID: ${result.id}`);
    console.log(`View at: https://instagram.com/${ig.username}`);
  });

igCmd
  .command("insights")
  .description("Get Instagram account insights")
  .requiredOption("--account <id>", "Instagram account ID, username, or linked page ID")
  .action(async (opts) => {
    const tokens = loadTokens();
    const ig = getInstagramAccount(tokens, opts.account);
    
    const result = await apiGet(ig.igId, ig.pageToken, {
      fields: "username,name,followers_count,follows_count,media_count,biography",
    });
    
    console.log(`\n@${result.username} (${result.name || ""})`);
    console.log("-".repeat(40));
    console.log(`Followers: ${result.followers_count || 0}`);
    console.log(`Following: ${result.follows_count || 0}`);
    console.log(`Posts: ${result.media_count || 0}`);
    if (result.biography) {
      console.log(`Bio: ${result.biography}`);
    }
  });

program.parse();
