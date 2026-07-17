const API_BASE_URL = "http://localhost:3000";

document.addEventListener("DOMContentLoaded", () => {
    if (!localStorage.getItem("token")) {
        window.location.href = "index.html";
        return;
    }

    loadLogs();
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

function formatJson(value) {
    if (!value) return "";
    return escapeHtml(JSON.stringify(value));
}

function formatOperation(operationType) {
    const labels = {
        CREATE_PRODUCT: "Envanter eklendi",
        UPDATE_PRODUCT: "Envanter düzenlendi",
        DELETE_PRODUCT: "Envanter silindi",
        CREATE_USER: "Kullanıcı oluşturuldu",
        UPDATE_USER_ROLE: "Kullanıcı rolü değiştirildi",
        DELETE_USER: "Kullanıcı silindi",
        CREATE_MAINTENANCE: "Arıza kaydı oluşturuldu",
        TRANSFER_PRODUCT: "Departman / zimmet transferi"
    };

    return labels[operationType] || operationType;
}

async function loadLogs() {
    const logTable = document.getElementById("logTable");

    try {
        const response = await fetch(`${API_BASE_URL}/logs`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            logTable.innerHTML = `<tr><td colspan="8">Logları görme yetkiniz yok.</td></tr>`;
            return;
        }

        const logs = await response.json();
        logTable.innerHTML = "";

        logs.forEach(log => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${log.log_id}</td>
                <td>${escapeHtml(formatOperation(log.operation_type))}</td>
                <td>${escapeHtml(log.operator)}</td>
                <td>${escapeHtml(log.changed_part)}</td>
                <td>${log.product_id || ""}</td>
                <td>${escapeHtml(log.operation_date)}</td>
                <td>${formatJson(log.previous_data)}</td>
                <td>${formatJson(log.new_data)}</td>
            `;
            logTable.appendChild(row);
        });
    } catch (error) {
        console.error("Loglar yüklenirken hata:", error);
        logTable.innerHTML = `<tr><td colspan="8">Bağlantı hatası.</td></tr>`;
    }
}
