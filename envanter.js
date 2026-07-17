const API_BASE_URL = "http://localhost:3000";

document.addEventListener("DOMContentLoaded", () => {
    if (!localStorage.getItem("token")) {
        window.location.href = "index.html";
        return;
    }

    loadProducts();
});

function getAuthHeaders() {
    return {
        "Authorization": `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json"
    };
}

function escapeHtml(value) {
    return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

async function loadProducts() {
    const table = document.getElementById("productTable");

    try {
        const response = await fetch(`${API_BASE_URL}/products`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            table.innerHTML = `<tr><td colspan="9">Envanter listesi yüklenemedi.</td></tr>`;
            return;
        }

        const products = await response.json();
        table.innerHTML = "";

        products.forEach(product => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${product.product_id}</td>
                <td>${escapeHtml(product.product_name)}</td>
                <td>${escapeHtml(product.department_name)}</td>
                <td>${escapeHtml(product.warranty_period)}</td>
                <td>${escapeHtml(product.brand)}</td>
                <td>${escapeHtml(product.model)}</td>
                <td>${escapeHtml(product.serial_number)}</td>
                <td>${escapeHtml(product.barcode)}</td>
                <td>
                    <button class="btn btn-primary btn-sm" onclick="window.location.href='dashboard.html'">Aç</button>
                </td>
            `;
            table.appendChild(row);
        });
    } catch (error) {
        console.error("Envanter yüklenirken hata:", error);
        table.innerHTML = `<tr><td colspan="9">Bağlantı hatası.</td></tr>`;
    }
}
