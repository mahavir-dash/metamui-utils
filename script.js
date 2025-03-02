function runScript(scriptName) {
    const loadingText = document.getElementById('loading');
    loadingText.style.display = 'block';

    fetch(`/run?script=${scriptName}`)
        .then(response => response.text())
        .then(data => {
            alert(data);
            loadingText.style.display = 'none';
        })
        .catch(error => {
            console.error("Error:", error);
            loadingText.style.display = 'none';
        });
}
