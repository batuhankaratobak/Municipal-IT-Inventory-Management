const API_BASE_URL = "http://localhost:3000";

document.addEventListener("DOMContentLoaded", () => {
    if (!localStorage.getItem("token")) {
        window.location.href = "index.html";
        return;
    }

    if (localStorage.getItem("role") !== "super_admin") {
        window.location.href = "dashboard.html";
        return;
    }

    loadUsers();
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

async function loadUsers() {
    const userTable = document.getElementById("userTable");
    const currentUsername = localStorage.getItem("username");

    try {
        const response = await fetch(`${API_BASE_URL}/users`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            userTable.innerHTML = `<tr><td colspan="4">Kullanıcıları görme yetkiniz yok.</td></tr>`;
            return;
        }

        const users = await response.json();
        userTable.innerHTML = "";

        users.forEach(user => {
            const isCurrentUser = user.username === currentUsername;
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${user.user_id}</td>
                <td>${escapeHtml(user.username)}</td>
                <td>
                    <select class="form-select form-select-sm" onchange="updateUserRole(${user.user_id}, this.value)" ${isCurrentUser ? "disabled" : ""}>
                        <option value="super_admin" ${user.role === "super_admin" ? "selected" : ""} disabled>Süper Admin</option>
                        <option value="admin" ${user.role === "admin" ? "selected" : ""}>Admin</option>
                        <option value="tech" ${user.role === "tech" ? "selected" : ""}>Tech</option>
                    </select>
                </td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="deleteUser(${user.user_id})" ${isCurrentUser ? "disabled" : ""}>Sil</button>
                </td>
            `;
            userTable.appendChild(row);
        });
    } catch (error) {
        console.error("Kullanıcılar yüklenirken hata:", error);
        userTable.innerHTML = `<tr><td colspan="4">Bağlantı hatası.</td></tr>`;
    }
}

function openAddUserForm() {
    document.getElementById("addUserForm").style.display = "block";
}

function closeAddUserForm() {
    document.getElementById("addUserForm").style.display = "none";
}

async function saveUser() {
    const userData = {
        username: document.getElementById("newUsername").value.trim(),
        password: document.getElementById("newPassword").value.trim(),
        role: document.getElementById("newRole").value
    };

    try {
        const response = await fetch(`${API_BASE_URL}/users`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify(userData)
        });

        if (!response.ok) {
            const data = await response.json();
            alert(data.message || "Kullanıcı eklenemedi.");
            return;
        }

        document.getElementById("newUsername").value = "";
        document.getElementById("newPassword").value = "";
        document.getElementById("newRole").value = "admin";
        closeAddUserForm();
        loadUsers();
    } catch (error) {
        console.error("Kullanıcı eklerken hata:", error);
        alert("Bağlantı hatası.");
    }
}

async function updateUserRole(userId, role) {
    try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}/role`, {
            method: "PUT",
            headers: getAuthHeaders(),
            body: JSON.stringify({ role })
        });

        if (!response.ok) {
            const data = await response.json();
            alert(data.message || "Rol güncellenemedi.");
            loadUsers();
            return;
        }

        loadUsers();
    } catch (error) {
        console.error("Kullanıcı rolü güncellenirken hata:", error);
        alert("Bağlantı hatası.");
        loadUsers();
    }
}

async function deleteUser(userId) {
    if (!confirm("Bu kullanıcıyı silmek istediğinize emin misiniz?")) return;

    try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
            method: "DELETE",
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            const data = await response.json();
            alert(data.message || "Kullanıcı silinemedi.");
            return;
        }

        loadUsers();
    } catch (error) {
        console.error("Kullanıcı silerken hata:", error);
        alert("Bağlantı hatası.");
    }
}
