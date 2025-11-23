console.log("Main.js loaded");

// Contoh fungsi untuk kirim order
async function sendOrder() {
    const payload = {
        service: "123",       // contoh service id
        data_no: "987654321", // contoh nomor id
        data_zone: "1234"     // contoh zone
    };

    try {
        const response = await fetch("/api/order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        console.log("API Result:", result);
        alert("Response: " + JSON.stringify(result));

    } catch (err) {
        console.error(err);
        alert("Error contacting server");
    }
}

// Jika ingin test tombol
document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("testOrderBtn");
    if (btn) {
        btn.addEventListener("click", sendOrder);
    }
});
