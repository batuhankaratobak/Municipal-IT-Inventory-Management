// Bu uygulamanın .html dosyaları arasında geçişini sağlıyor 
// Kullanıcı girişi yapılıp yapılmadığını kontrol ediyor.
// Kullanıcı girişi yapılmamışsa index.html sayfasına yönlendiriyor.
// Kullanıcı girişi yapılmışsa dashboard.html sayfasına yönlendiriyor.

async function login() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const errorMessage = document.getElementById("errorMessage");
  
    try {
        const response = await fetch('http://localhost:3000/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
  
        if (response.ok) {
            localStorage.setItem("token", data.token);
            localStorage.setItem("role", data.role);
            localStorage.setItem("username", data.username || username);
            window.location.href = "dashboard.html";
        } else {
            errorMessage.innerText = data.message;
            errorMessage.style.display = "block";
        }
    } catch (error) {
        errorMessage.innerText = "Bağlantı hatası!";
        errorMessage.style.display = "block";
    }
  }
  
