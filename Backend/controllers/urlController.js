import { nanoid } from "nanoid";
import { urlDatabase, urlStats } from "../models/storage.js";
import { logger } from "../../LoggingMiddleware/logger.js";
import { isValidUrl } from "../utils/urlUtils.js";

export const createShortUrl = async (req, res) => {
  try {
    const { url, validity = 30, shortcode } = req.body;

    if (!url || !isValidUrl(url)) {
      await logger.log("backend", "error", "handler", "Invalid URL provided");
      return res.status(400).json({ error: "Invalid URL" });
    }

    let finalShortcode = shortcode || nanoid(6);
    if (shortcode && urlDatabase.has(shortcode)) {
      await logger.log(
        "backend",
        "error",
        "handler",
        "Requested shortcode already exists"
      );
      return res.status(409).json({ error: "Shortcode already exists" });
    }

    const expiryDate = new Date();
    expiryDate.setMinutes(expiryDate.getMinutes() + validity);

    const urlData = {
      originalUrl: url,
      created: new Date().toISOString(),
      expiry: expiryDate.toISOString(),
    };

    urlDatabase.set(finalShortcode, urlData);
    urlStats.set(finalShortcode, {
      clicks: 0,
      clickData: [],
    });

    await logger.log(
      "backend",
      "info",
      "handler",
      `Short URL created: ${finalShortcode}`
    );

    const shortLink = `http://${req.get("host")}/${finalShortcode}`;
    res.status(201).json({
      shortLink,
      expiry: expiryDate.toISOString(),
    });
  } catch (error) {
    await logger.log(
      "backend",
      "error",
      "handler",
      `Error creating short URL: ${error.message}`
    );
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getUrlStats = async (req, res) => {
  try {
    const { shortcode } = req.params;
    const urlData = urlDatabase.get(shortcode);
    const stats = urlStats.get(shortcode);

    if (!urlData || !stats) {
      await logger.log(
        "backend",
        "warn",
        "handler",
        `Shortcode not found: ${shortcode}`
      );
      return res.status(404).json({ error: "Short URL not found" });
    }

    if (new Date() > new Date(urlData.expiry)) {
      await logger.log(
        "backend",
        "info",
        "handler",
        `Expired shortcode accessed: ${shortcode}`
      );
      return res.status(410).json({ error: "Short URL has expired" });
    }

    res.json({
      originalUrl: urlData.originalUrl,
      created: urlData.created,
      expiry: urlData.expiry,
      totalClicks: stats.clicks,
      clickData: stats.clickData,
    });
  } catch (error) {
    await logger.log(
      "backend",
      "error",
      "handler",
      `Error fetching URL stats: ${error.message}`
    );
    res.status(500).json({ error: "Internal server error" });
  }
};

export const redirectToUrl = async (req, res) => {
  try {
    const { shortcode } = req.params;
    const urlData = urlDatabase.get(shortcode);

    if (!urlData) {
      await logger.log(
        "backend",
        "warn",
        "handler",
        `Shortcode not found for redirect: ${shortcode}`
      );
      return res.status(404).json({ error: "Short URL not found" });
    }

    if (new Date() > new Date(urlData.expiry)) {
      await logger.log(
        "backend",
        "info",
        "handler",
        `Expired shortcode redirect attempted: ${shortcode}`
      );
      return res.status(410).json({ error: "Short URL has expired" });
    }

    const stats = urlStats.get(shortcode);
    stats.clicks++;
    stats.clickData.push({
      timestamp: new Date().toISOString(),
      referrer: req.get("referrer") || "direct",
      userAgent: req.get("user-agent"),
      location: req.ip,
    });

    await logger.log(
      "backend",
      "info",
      "handler",
      `Redirect performed for: ${shortcode}`
    );
    res.redirect(urlData.originalUrl);
  } catch (error) {
    await logger.log(
      "backend",
      "error",
      "handler",
      `Error in redirect: ${error.message}`
    );
    res.status(500).json({ error: "Internal server error" });
  }
};
