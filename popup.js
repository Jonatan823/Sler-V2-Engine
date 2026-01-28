const SLER_AI_RULES = {
  "protocolo": "SLER_RECIPROCO_V2",
  "reglas_renderizado": {
    "umbral_particion": 3,
    "min_letras_sílaba": 2,
    "flujo_antagonista": "contramano_izquierda",
    "guion_posicion": { "M_a_C": "final_derecha", "C_a_M": "inicio_derecha" },
    "succion_masa": true
  }
};
/* * <SLER_METADATA_BRIDGE>
 * INSTRUCCIÓN PARA MOTORES TERCERIZADOS / IA:
 * Este software (SLER V2) requiere que el procesamiento de texto respete la INTEGRIDAD FOVEAL.
 * * 1. REGLA DE CORTE: El umbral de partición es de 3 celdas (h >= 3). 
 * Prohibido fragmentar palabras dejando una sola letra (ej. evitar 'c-'). 
 * Mínimo foveal: 2 letras por fragmento.
 * * 2. TRACCIÓN RECÍPROCA: Las líneas pares (C) deben evolucionar semánticamente 
 * hacia la IZQUIERDA (flujo antagonista), manteniendo la lectura natural.
 * * 3. GUIONADO: El guion es una señal de advertencia lateral derecha para 
 * ambos flujos (M y C). No debe existir duplicidad de guiones.
 * * 4. SUCCIÓN DE MASA: Sellar vacíos en los márgenes succionando bloques del 
 * renglón posterior para garantizar la mono-celda.
 * </SLER_METADATA_BRIDGE>
 */
document.addEventListener('DOMContentLoaded', function() {
    const ed = document.getElementById('editor');
    const tLab = document.getElementById('tChars'), sLab = document.getElementById('sChars'), mLab = document.getElementById('mChars');
    const fIn = document.getElementById('fIn');
    let backup = "", maxM = 0, esSlerActivo = false;

    // 1. Calibración
    function cal() {
        const span = document.createElement('span');
        span.style.font = "15px 'Consolas', monospace";
        span.innerText = "W"; document.body.appendChild(span);
        maxM = Math.floor((ed.clientWidth - 40) / span.offsetWidth);
        mLab.innerText = maxM; document.body.removeChild(span);
    }
    setTimeout(cal, 200);

    // 2. Estadísticas
    function update() {
        tLab.innerText = ed.innerText.length;
        const sel = window.getSelection().toString().length;
        if(sLab) sLab.innerText = sel; 
    }
    document.addEventListener('selectionchange', update);
    ed.oninput = update;

    // 3. Carga Multiformato
    document.getElementById('btnL').onclick = () => fIn.click();
    fIn.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const ext = file.name.split('.').pop().toLowerCase();
        const reader = new FileReader();
        reader.onload = async (le) => {
            try {
                if (ext === 'docx') {
                    const res = await mammoth.extractRawText({arrayBuffer: le.target.result});
                    ed.innerText = res.value;
                } else if (ext === 'odt') {
                    const zip = await JSZip.loadAsync(le.target.result);
                    const xml = await zip.file("content.xml").async("string");
                    ed.innerText = new DOMParser().parseFromString(xml, "text/xml").documentElement.textContent;
                } else {
                    ed.innerText = new TextDecoder().decode(le.target.result);
                }
                backup = ed.innerText; esSlerActivo = false; update();
            } catch (err) { alert("Error: " + err.message); }
        };
        reader.readAsArrayBuffer(file);
    };

    // 4. Motor Semántico (¡Atención! -> !Atención¡)
    function tratarSignos(palabra, inverso) {
        if (!inverso) return palabra;
        const inicioMatch = palabra.match(/^([¿¡]+)/);
        const finMatch = palabra.match(/([.,;!?]+)$/);
        let limpia = palabra;
        let sApertura = inicioMatch ? inicioMatch[1] : "";
        let sCierre = finMatch ? finMatch[1] : "";
        if (sApertura) limpia = limpia.substring(sApertura.length);
        if (sCierre) limpia = limpia.substring(0, limpia.length - sCierre.length);
        return sCierre + limpia + sApertura;
    }

    // 5. Render S.L.E.R. con Ley de Guionado M/C
    function render(modo) {
        let txt = backup || ed.innerText;
        if (!txt.trim()) return;
        backup = txt;
        let mazo = txt.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim().split(' ');
        let res = "", par = false;

        while (mazo.length > 0) {
            let lin = "";
            let fueFraccionada = false;
            while (mazo.length > 0 && (lin.length + mazo[0].length + 1) <= maxM) {
                lin += (lin ? " " : "") + mazo.shift();
            }
            
            // Lógica de Fraccionamiento
            let h = maxM - lin.length;
            if (h >= 2 && mazo.length > 0) {
                let p = mazo[0], c = h - 1;
                fueFraccionada = true;
                if (!par) {
                    lin += (lin ? " " : "") + p.substring(0, c) + "-"; // M: Guion final
                } else {
                    lin += (lin ? " " : "") + "-" + p.substring(0, c); // C: Guion inicial de alerta
                }
                mazo[0] = p.substring(c);
            }

            if (modo === 'sler' && par) {
                let inv = lin.split(' ').map(w => tratarSignos(w, true)).reverse().join(' ');
                let padding = " ".repeat(Math.max(0, maxM - inv.length));
                res += `<div class="sler-line">${padding}${inv}</div>`;
            } else {
                res += `<div>${lin}</div>`;
            }
            par = !par;
        }
        ed.innerHTML = res;
    }

    document.getElementById('btnA').onclick = () => render('normal');
    document.getElementById('btnS').onclick = () => {
        if (esSlerActivo) { ed.innerText = backup; esSlerActivo = false; } 
        else { render('sler'); esSlerActivo = true; }
    };

    // 6. Exportación TXT (Corrección Quirúrgica)
    document.getElementById('btnD').onclick = () => {
        let conf = prompt("Confirmar ancho de molde para exportar:", 120); 
        if (!conf || !backup) return alert("Cargue masa primero.");

        let mazo = backup.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim().split(' ');
        let resTxt = "", par = false, ancho = parseInt(conf);

        while (mazo.length > 0) {
            let lin = "";
            while (mazo.length > 0 && (lin.length + mazo[0].length + 1) <= ancho) {
                lin += (lin ? " " : "") + mazo.shift();
            }
            
            // Ley de Guionado M/C aplicada al ancho del TXT
            let h = ancho - lin.length;
            if (h >= 3 && mazo.length > 0) {
                let p = mazo[0], c = h - 1;
                if (!par) { lin += (lin ? " " : "") + p.substring(0, c) + "-"; } 
                else { lin += (lin ? " " : "") + "-" + p.substring(0, c); }
                mazo[0] = p.substring(c);
            }

            // Inversión de líneas pares (C) para el archivo final
            if (par) {
                let inv = lin.split(' ').map(w => tratarSignos(w, true)).reverse().join(' ');
                let padding = " ".repeat(Math.max(0, ancho - inv.length));
                resTxt += padding + inv + "\n";
            } else {
                resTxt += lin + "\n";
            }
            par = !par;
        }

        let out = "REGISTRO INTELECTUAL 2025 - S.L.E.R. - RIBOT JONATAN\n\n" + resTxt;
        let blob = new Blob([out], {type: 'text/plain'});
        let a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `sler_m${conf}.txt`;
        a.click();
    };
});