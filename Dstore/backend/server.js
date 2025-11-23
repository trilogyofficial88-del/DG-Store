const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
const cors = require("cors");
const md5 = require("md5");
const path = require("path");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Simple request logger for debugging
app.use((req, res, next) => {
    console.log(`➡️ ${new Date().toISOString()} ${req.method} ${req.url}`);
    if (["POST", "PUT", "PATCH"].includes(req.method)) {
        console.log("   Body:", JSON.stringify(req.body));
    }
    next();
});

// ======================= SERVE FRONTEND ==========================
app.use(express.static(path.join(__dirname, "../frontend/public")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/public/index.html"));
});

// ======================= UNIVERSAL GET SERVICES ==========================
app.post("/api/services", async (req, res) => {
    console.log("📩 Request /api/services:", req.body);

    const key = process.env.API_KEY;
    const api_id = process.env.API_ID;
    const gameName = req.body.game;

    if (!gameName) {
        return res.status(400).json({
            result: false,
            message: "Parameter 'game' wajib diisi"
        });
    }

    const sign = md5(api_id + key);
    console.log("   [DEBUG] sign:", sign, "api_id:", api_id ? "[OK]" : "[MISSING]", "key:", key ? "[OK]" : "[MISSING]");

    try {
        const formData = new URLSearchParams();
        formData.append("key", key);
        formData.append("sign", sign);
        formData.append("type", "services");
        formData.append("filter_type", "game");
        formData.append("filter_value", gameName);
        formData.append("filter_status", "available");

        console.log("   [DEBUG] formData entries:");
        for (const [k, v] of formData) console.log("      ", k, "=", v);

        const response = await axios.post(
            "https://vip-reseller.co.id/api/game-feature",
            formData,
            { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 15000 }
        );

        console.log("📥 Respon:", { 
            status: response.status, 
            dataSummary: Array.isArray(response.data?.data) ? `data length ${response.data.data.length}` : typeof response.data 
        });

        // ========== FORMAT HASIL (Harga BASIC) ==========
        if (response.data.result && Array.isArray(response.data.data)) {
            response.data.data = response.data.data.map(item => {
                const p = item.price || {};

                const priceBasic =
                    p.basic ||
                    p.basic_price ||
                    p.customer ||
                    p.seller ||
                    p.price ||
                    0;

                return {
                    ...item,
                    price_basic: Number(priceBasic),
                    price: Number(priceBasic)
                };
            });
        }

        return res.json(response.data);

    } catch (err) {
        console.error("❌ API ERROR:", err.message);
        if (err.isAxiosError) {
            console.error("   axios error code:", err.code);
            if (err.response) {
                console.error("   response status:", err.response.status);
                console.error("   response headers:", err.response.headers);
                console.error("   response data:", JSON.stringify(err.response.data));
            } else {
                console.error("   no response received (network / timeout?)");
                console.error("   request config:", err.config ? { url: err.config.url, method: err.config.method } : {});
            }
        } else {
            console.error("   non-axios error stack:", err.stack);
        }

        res.status(500).json({
            result: false,
            message: "Gagal mengambil layanan",
            error: err.response?.data || err.message
        });
    }
});

// ======================= GET NICKNAME (FINAL FIX) ==========================
app.post("/api/get-nickname", async (req, res) => {
    console.log("📩 Request /api/get-nickname:", req.body);

    const key = process.env.API_KEY;
    const api_id = process.env.API_ID;
    const sign = md5(api_id + key);
    console.log("   [DEBUG] sign:", sign, "api_id:", api_id ? "[OK]" : "[MISSING]", "key:", key ? "[OK]" : "[MISSING]");

    let { code, target, additional_target } = req.body;

    // ========== AUTO MAP CODE ==========
    const codeMap = {
        "ml": "mobile-legends",
        "mlbb": "mobile-legends",
        "mobile": "mobile-legends",
        "mobilelegends": "mobile-legends",
        "mobile-legends": "mobile-legends",
        "hago": "hago",
        "zepeto": "zepeto",
        "ff": "free-fire",
        "freefire": "free-fire",
        "free-fire": "free-fire",
        "garena": "free-fire",
    };

    console.log("   [DEBUG] incoming code:", code, "target:", target, "additional_target:", additional_target);

    if (code && codeMap[code]) {
        code = codeMap[code];
        console.log("   [DEBUG] mapped code ->", code);
    }

    if (!code || !target) {
        console.warn("   [WARN] missing code or target");
        return res.status(400).json({
            result: false,
            message: "Parameter tidak lengkap"
        });
    }

    try {
        const formData = new URLSearchParams();
        formData.append("key", key);
        formData.append("sign", sign);
        formData.append("type", "get-nickname");
        formData.append("code", code);
        formData.append("target", target);

        if (additional_target) {
            formData.append("additional_target", additional_target);
        }

        console.log("   [DEBUG] formData entries for get-nickname:");
        for (const [k, v] of formData) console.log("      ", k, "=", v);

        const response = await axios.post(
            "https://vip-reseller.co.id/api/game-feature",
            formData,
            { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 15000 }
        );

        console.log("📥 Nickname Response:", { status: response.status, data: response.data });
        return res.json(response.data);

    } catch (err) {
        console.error("❌ Nickname API ERROR:", err.message);
        if (err.isAxiosError) {
            console.error("   axios error code:", err.code);
            if (err.response) {
                console.error("   response status:", err.response.status);
                console.error("   response headers:", err.response.headers);
                console.error("   response data:", JSON.stringify(err.response.data));
            } else {
                console.error("   no response received (network / timeout)");
                console.error("   request config:", err.config ? { url: err.config.url, method: err.config.method, data: err.config.data } : {});
            }
        } else {
            console.error("   non-axios error stack:", err.stack);
        }

        return res.status(500).json({
            result: false,
            message: "Gagal mengambil nickname",
            error: err.response?.data || err.message
        });
    }
});

// ======================= DEBUG GAME LIST ==========================
app.post("/api/debug-games", async (req, res) => {
    const key = process.env.API_KEY;
    const api_id = process.env.API_ID;
    const sign = md5(api_id + key);

    try {
        const formData = new URLSearchParams();
        formData.append("key", key);
        formData.append("sign", sign);
        formData.append("type", "services");
        formData.append("filter_type", "game");
        formData.append("filter_value", "");

        const response = await axios.post(
            "https://vip-reseller.co.id/api/game-feature",
            formData,
            { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 15000 }
        );

        res.json(response.data);

    } catch (err) {
        console.error("❌ debug-games ERROR:", err.message);
        if (err.isAxiosError && err.response) {
            console.error("   response status:", err.response.status);
            console.error("   response data:", JSON.stringify(err.response.data));
        }
        res.json({ error: err.response?.data || err.message });
    }
});

// ======================= PLACE ORDER (DITAMBAHKAN) ==========================
app.post("/api/order", async (req, res) => {
    console.log("📩 Request /api/order:", req.body);

    const key = process.env.API_KEY;
    const api_id = process.env.API_ID;

    if (!key || !api_id) {
        console.error("❌ API KEY/API ID missing in .env");
        return res.status(500).json({
            status: false,
            message: "Server error: API Key or API ID missing"
        });
    }

    const sign = md5(api_id + key);

    const { service, data_no, data_zone } = req.body;

    if (!service || !data_no) {
        console.warn("⚠️ Missing service or data_no");
        return res.status(400).json({
            status: false,
            message: "Parameter wajib: service, data_no"
        });
    }

    try {
        const formData = new URLSearchParams();
        formData.append("key", key);
        formData.append("sign", sign);
        formData.append("type", "order");
        formData.append("service", service);
        formData.append("data_no", data_no);
        if (data_zone) formData.append("data_zone", data_zone);

        console.log("   [DEBUG] formData for order:");
        for (const [k, v] of formData) console.log("      ", k, "=", v);

        const response = await axios.post(
            "https://vip-reseller.co.id/api/game-feature",
            formData,
            {
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                timeout: 15000
            }
        );

        console.log("📥 ORDER RESPONSE:", response.data);
        return res.json(response.data);

    } catch (err) {
        console.error("❌ ORDER API ERROR:", err.message);

        if (err.isAxiosError) {
            console.error("   axios code:", err.code);
            if (err.response) {
                console.error("   response status:", err.response.status);
                console.error("   response headers:", err.response.headers);
                console.error("   response data:", JSON.stringify(err.response.data));
            } else {
                console.error("   NO RESPONSE received (timeout/network)");
            }
        }

        return res.status(500).json({
            status: false,
            message: "Gagal melakukan order",
            error: err.response?.data || err.message
        });
    }
});

// ======================= RUN SERVER ==========================
app.listen(3000, () => console.log("🚀 Server running on port 3000"));

