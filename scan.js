const API_BASE_URL = "http://localhost:3000";
let currentProduct = null;

document.addEventListener("DOMContentLoaded", () => {
    if (!localStorage.getItem("token")) {
        window.location.href = "index.html";
        return;
    }

    const barcodeInput = document.getElementById("barcodeInput");
    barcodeInput.focus();
    barcodeInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            searchBarcode();
        }
    });

    loadDepartments();
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

function setText(id, value) {
    document.getElementById(id).innerText = value || "-";
}

function showMessage(message, type = "info") {
    document.getElementById("scanMessage").innerHTML = `<div class="alert alert-${type}">${escapeHtml(message)}</div>`;
}

function clearResult() {
    currentProduct = null;
    document.getElementById("barcodeInput").value = "";
    document.getElementById("productResult").style.display = "none";
    document.getElementById("scanMessage").innerHTML = "";
    document.getElementById("barcodeInput").focus();
}

async function searchBarcode() {
    const barcode = document.getElementById("barcodeInput").value.trim();

    if (!barcode) {
        showMessage("Barkod okutun veya seri numarası girin.", "warning");
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/products/barcode/${encodeURIComponent(barcode)}`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            const data = await response.json();
            document.getElementById("productResult").style.display = "none";
            showMessage(data.message || "Ürün bulunamadı.", "danger");
            return;
        }

        const product = await response.json();
        renderProduct(product);
        showMessage("Ürün bulundu.", "success");
    } catch (error) {
        console.error("Barkod aranırken hata:", error);
        showMessage("Bağlantı hatası.", "danger");
    }
}

function renderProduct(product) {
    currentProduct = product;
    setText("resultProductName", product.product_name);
    setText("resultDepartment", product.department_name);
    setText("resultBarcode", product.barcode);
    setText("resultBrand", product.brand);
    setText("resultModel", product.model);
    setText("resultSerial", product.serial_number);
    setText("resultWarranty", product.warranty_period);
    setText("resultAssignee", [product.user_first_name, product.user_last_name].filter(Boolean).join(" "));
    setText("resultUpdated", product.last_update_date);

    document.getElementById("editProductButton").onclick = () => {
        window.location.href = `dashboard.html?productId=${product.product_id}`;
    };

    document.getElementById("productResult").style.display = "block";
    document.getElementById("transferDepartment").value = product.department_name || "";
    document.getElementById("transferFirstName").value = product.user_first_name || "";
    document.getElementById("transferLastName").value = product.user_last_name || "";
    loadMaintenanceHistory(product.product_id);
    loadMovementHistory(product.product_id);
}

async function loadDepartments() {
    try {
        const response = await fetch(`${API_BASE_URL}/departments`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) return;

        const departments = await response.json();
        const departmentSelect = document.getElementById("transferDepartment");
        departmentSelect.innerHTML = '<option value="">Departman seçiniz</option>';

        departments.forEach(department => {
            const option = document.createElement("option");
            option.value = department.department_name;
            option.textContent = department.department_name;
            departmentSelect.appendChild(option);
        });
    } catch (error) {
        console.error("Departmanlar yüklenirken hata:", error);
    }
}

function statusLabel(status) {
    const labels = {
        open: "Açık",
        in_progress: "İşlemde",
        resolved: "Çözüldü"
    };
    return labels[status] || status;
}

async function loadMaintenanceHistory(productId) {
    const history = document.getElementById("maintenanceHistory");
    history.innerHTML = "Yükleniyor...";

    try {
        const response = await fetch(`${API_BASE_URL}/products/${productId}/maintenance`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            history.innerHTML = "Arıza geçmişi alınamadı.";
            return;
        }

        const records = await response.json();

        if (records.length === 0) {
            history.innerHTML = "Henüz arıza kaydı yok.";
            return;
        }

        history.innerHTML = records.map(record => `
            <div class="border-bottom py-2">
                <div class="fw-semibold">${escapeHtml(record.issue_title)}</div>
                <div>${escapeHtml(record.issue_description)}</div>
                <div class="small text-muted">${escapeHtml(statusLabel(record.status))} - ${escapeHtml(record.created_by)} - ${escapeHtml(record.created_at)}</div>
                ${record.resolution_note ? `<div class="small">Çözüm: ${escapeHtml(record.resolution_note)}</div>` : ""}
            </div>
        `).join("");
    } catch (error) {
        console.error("Arıza geçmişi yüklenirken hata:", error);
        history.innerHTML = "Bağlantı hatası.";
    }
}

async function loadMovementHistory(productId) {
    const history = document.getElementById("movementHistory");
    history.innerHTML = "Yükleniyor...";

    try {
        const response = await fetch(`${API_BASE_URL}/products/${productId}/movements`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            history.innerHTML = "Transfer geçmişi alınamadı.";
            return;
        }

        const records = await response.json();

        if (records.length === 0) {
            history.innerHTML = "Henüz transfer kaydı yok.";
            return;
        }

        history.innerHTML = records.map(record => `
            <div class="border-bottom py-2">
                <div class="fw-semibold">${escapeHtml(record.from_department_name)} -> ${escapeHtml(record.to_department_name)}</div>
                <div class="small">Yeni zimmetli: ${escapeHtml([record.to_user_first_name, record.to_user_last_name].filter(Boolean).join(" ") || "-")}</div>
                <div class="small text-muted">${escapeHtml(record.moved_by)} - ${escapeHtml(record.moved_at)}</div>
                ${record.note ? `<div class="small">Not: ${escapeHtml(record.note)}</div>` : ""}
            </div>
        `).join("");
    } catch (error) {
        console.error("Transfer geçmişi yüklenirken hata:", error);
        history.innerHTML = "Bağlantı hatası.";
    }
}

async function createMaintenance() {
    if (!currentProduct) return;

    const payload = {
        issue_title: document.getElementById("issueTitle").value.trim(),
        issue_description: document.getElementById("issueDescription").value.trim(),
        status: document.getElementById("issueStatus").value,
        resolution_note: document.getElementById("resolutionNote").value.trim()
    };

    try {
        const response = await fetch(`${API_BASE_URL}/products/${currentProduct.product_id}/maintenance`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) {
            showMessage(data.message || "Arıza kaydı oluşturulamadı.", "danger");
            return;
        }

        document.getElementById("issueTitle").value = "";
        document.getElementById("issueDescription").value = "";
        document.getElementById("issueStatus").value = "open";
        document.getElementById("resolutionNote").value = "";
        showMessage("Arıza kaydı oluşturuldu.", "success");
        loadMaintenanceHistory(currentProduct.product_id);
    } catch (error) {
        console.error("Arıza kaydı oluşturulurken hata:", error);
        showMessage("Bağlantı hatası.", "danger");
    }
}

async function createTransfer() {
    if (!currentProduct) return;

    const payload = {
        to_department_name: document.getElementById("transferDepartment").value,
        to_user_first_name: document.getElementById("transferFirstName").value.trim(),
        to_user_last_name: document.getElementById("transferLastName").value.trim(),
        note: document.getElementById("transferNote").value.trim()
    };

    try {
        const response = await fetch(`${API_BASE_URL}/products/${currentProduct.product_id}/transfer`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) {
            showMessage(data.message || "Transfer yapılamadı.", "danger");
            return;
        }

        currentProduct = data.product;
        renderProduct(data.product);
        document.getElementById("transferNote").value = "";
        showMessage("Transfer kaydı oluşturuldu.", "success");
    } catch (error) {
        console.error("Transfer yapılırken hata:", error);
        showMessage("Bağlantı hatası.", "danger");
    }
}
