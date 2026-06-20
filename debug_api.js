const fs = require('fs');
fetch('https://script.google.com/macros/s/AKfycbycE6D4n-J03V233f2T-zYpL_9j6D61G9s539o9e9w9kZ6z_R71bQe-aQGfQ1L14l_x/exec?action=getData')
    .then(res => res.json())
    .then(data => {
        fs.writeFileSync('api_dump.json', JSON.stringify(data.mantenciones, null, 2));
        console.log("Dumped", data.mantenciones.length, "mantenciones");
    })
    .catch(console.error);
