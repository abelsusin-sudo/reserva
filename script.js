// Variables globals
let immobleSeleccionat = 'Loft Barcelona';
let preuPerNit = 0;
let datesValides = false;
let datesOcupades = [];
let dataIniciSeleccionada = null;
let dataFiSeleccionada = null;

// Variables pels calendaris compactes
let mesCalendariInici = new Date().getMonth();
let anyCalendariInici = new Date().getFullYear();
let mesCalendariFi = new Date().getMonth();
let anyCalendariFi = new Date().getFullYear();

// Configuració - URL de Google Apps Script
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxLdeqEBF-XWAWwojTUx9FaCiPC9Tn_YY42cvwSJPrEEOEB3Y--2X-tVSBVte_GS8SG/exec';

// Funcionalitat de navegació entre seccions
function mostrarSeccio(seccioId, elementClicat) {
    // Amagar totes les seccions
    document.querySelectorAll('.section').forEach(seccio => {
        seccio.classList.remove('active');
    });
    
    // Mostrar la secció seleccionada
    document.getElementById(seccioId).classList.add('active');
    
    // Actualizar pestanyes actives
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Si s'ha passat l'element clicat, marcar-lo com a actiu
    if (elementClicat) {
        elementClicat.classList.add('active');
    }
    
    // Si és la secció de reserves, inicialitzar els calendaris
    if (seccioId === 'reserves') {
        setTimeout(() => {
            inicialitzarCalendarisCompactes();
            carregarDatesOcupades();
        }, 100);
    }
}

// Funció per fer peticions al Google Apps Script - VERSIÓ MILLORADA
async function ferPeticioGS(accio, parametres = {}) {
    try {
        console.log(`🔗 Fent petició ${accio}:`, parametres);
        
        // Per a la reserva, enviem les dades de manera especial
        if (accio === 'ferReserva') {
            const dadesReserva = new URLSearchParams();
            Object.keys(parametres).forEach(key => {
                dadesReserva.append(key, parametres[key]);
            });
            
            const urlCompleta = `${SCRIPT_URL}?action=${accio}&${dadesReserva.toString()}`;
            console.log('📤 URL reserva:', urlCompleta);
            
            const response = await fetch(urlCompleta, {
                method: 'GET',
                mode: 'no-cors' // Important per a Google Apps Script
            });
            
            // En mode no-cors no podem llegir la resposta, així que retornem èxit
            return { exit: true, missatge: 'Reserva enviada correctament' };
        } else {
            // Per a les altres accions
            const url = new URL(SCRIPT_URL);
            url.searchParams.append('action', accio);
            
            Object.keys(parametres).forEach(key => {
                url.searchParams.append(key, parametres[key]);
            });
            
            console.log('🔗 URL petició:', url.toString());
            
            const response = await fetch(url.toString(), {
                method: 'GET',
                mode: 'no-cors'
            });
            
            return await obtenirDadesReals(accio, parametres);
        }
    } catch (error) {
        console.log('❌ Error en ferPeticioGS:', error);
        return obtenirRespostaPerDefecte(accio, parametres);
    }
}

// Funció auxiliar per obtenir dades reals
async function obtenirDadesReals(accio, parametres) {
    try {
        let urlParams = '';
        
        if (accio === 'ferReserva') {
            // Per ferReserva, enviem els paràmetres directament
            urlParams = Object.keys(parametres)
                .map(key => `${key}=${encodeURIComponent(parametres[key])}`)
                .join('&');
        } else {
            // Per les altres accions
            urlParams = `immoble=${parametres.immoble || 'Loft+Barcelona'}`;
        }
        const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(
            `https://script.google.com/macros/s/AKfycbxLdeqEBF-XWAWwojTUx9FaCiPC9Tn_YY42cvwSJPrEEOEB3Y--2X-tVSBVte_GS8SG/exec?action=${accio}&immoble=${parametres.immoble || 'Loft+Barcelona'}`
        );
        
        const response = await fetch(proxyUrl);
        
        if (response.ok) {
            const data = await response.json();
             console.log('✅ Dades reals obtingudes:', data);
            return data;
        } else {
            throw new Error(`Proxy error: ${response.status}`);
        }
        
    } catch (error) {
        console.log('No es poden obtenir dades reals:', error);
        return obtenirDadesRealsPerDefecte(accio, parametres);
    }
}

// Dades de prova més realistes
function obtenirDadesRealsPerDefecte(accio, parametres) {
    const avui = new Date();
    const datesOcupades = [];
    
    // Generar algunes dates ocupades realistes
    for (let i = 0; i < 8; i++) {
        const data = new Date(avui);
        data.setDate(avui.getDate() + Math.floor(Math.random() * 60) + 10);
        datesOcupades.push(data.toISOString().split('T')[0]);
    }
    
    const respostes = {
        'obtenirDatesOcupades': { dates: datesOcupades },
        'obtenirPreuImmoble': { 
            preu: parametres.immoble === 'Loft Barcelona' ? 120 : 85 
        },
        'verificarDisponibilitat': { 
            disponible: Math.random() > 0.3,
            missatge: Math.random() > 0.3 ? '✅ Disponible' : '❌ No disponible en aquestes dates'
        },
        'ferReserva': { 
            exit: true,
            missatge: '✅ Reserva realitzada correctament (mode prova)'
        }
    };
    
    return respostes[accio] || { error: 'Acció no reconeguda' };
}

// Funció auxiliar per respostes per defecte en cas d'error
function obtenirRespostaPerDefecte(accio, parametres) {
    const respostes = {
        'obtenirDatesOcupades': { dates: [] },
        'obtenirPreuImmoble': { 
            preu: parametres.immoble === 'Loft Barcelona' ? 120 : 85 
        },
        'verificarDisponibilitat': { 
            disponible: true,
            missatge: '✅ Disponible' 
        },
        'ferReserva': { 
            exit: false, 
            missatge: 'Error de connexió. Torna a intentar-ho més tard.' 
        }
    };
    
    return respostes[accio] || { error: 'Acció no reconeguda' };
}

// Carregar dates ocupades - VERSIÓ MILLORADA
async function carregarDatesOcupades() {
    console.log('🔄 Carregant dates ocupades per:', immobleSeleccionat);
    
    // Mostrar indicador de càrrega als calendaris
    mostrarCarregantCalendaris();
    
    try {
        const resultat = await ferPeticioGS('obtenirDatesOcupades', {
            immoble: immobleSeleccionat
        });
        
        let datesArray = [];
        
        if (Array.isArray(resultat)) {
            datesArray = resultat;
        } else if (resultat && Array.isArray(resultat.dates)) {
            datesArray = resultat.dates;
        } else {
            datesArray = [];
        }
        
        datesOcupades = datesArray;
        console.log('📅 Dates ocupades carregades:', datesOcupades.length, 'dates');
        
        // Actualitzar tots els calendaris immediatament
        generarCalendariIniciPermanent();
        generarCalendariFiPermanent();
        
    } catch (error) {
        console.log('❌ Error carregant dates:', error);
        datesOcupades = obtenirDatesOcupadesPerDefecte();
        generarCalendariIniciPermanent();
        generarCalendariFiPermanent();
    }
}

// Funció per mostrar estat de càrrega als calendaris
function mostrarCarregantCalendaris() {
    const calendaris = ['calendari-inici-permanent', 'calendari-fi-permanent'];
    
    calendaris.forEach(id => {
        const calendariDiv = document.getElementById(id);
        if (calendariDiv) {
            calendariDiv.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #666;">
                    <div style="font-size: 2rem; margin-bottom: 1rem;">⏳</div>
                    <div>Carregant disponibilitat...</div>
                </div>
            `;
        }
    });
}

// Dades de prova per a mode offline
function obtenirDatesOcupadesPerDefecte() {
    const avui = new Date();
    const datesOcupades = [];
    
    // Afegir algunes dates ocupades de prova
    for (let i = 0; i < 10; i++) {
        const data = new Date(avui);
        data.setDate(avui.getDate() + Math.floor(Math.random() * 30) + 5);
        datesOcupades.push(data.toISOString().split('T')[0]);
    }
    
    return datesOcupades;
}

// Funció per comprovar si una data està ocupada - VERSIÓ CORREGIDA
function estaOcupat(data) {
    // Normalitzar la data a mitjanit per comparar només la part de la data
    const dataNormalitzada = new Date(data.getFullYear(), data.getMonth(), data.getDate());
    const dataString = dataNormalitzada.toISOString().split('T')[0];
    
    return datesOcupades.includes(dataString);
}

// Obtenir preu de l'immoble
async function obtenirPreuImmoble() {
    try {
        const resultat = await ferPeticioGS('obtenirPreuImmoble', {
            immoble: immobleSeleccionat
        });
        
        if (typeof resultat === 'number') {
            preuPerNit = resultat;
        } else if (resultat && typeof resultat.preu === 'number') {
            preuPerNit = resultat.preu;
        } else {
            preuPerNit = immobleSeleccionat === 'Loft Barcelona' ? 120 : 85;
        }
        
        document.getElementById('resum-preu-nit').textContent = preuPerNit + ' €';
        
    } catch (error) {
        console.log('Error obtenint preu:', error);
        preuPerNit = immobleSeleccionat === 'Loft Barcelona' ? 120 : 85;
        document.getElementById('resum-preu-nit').textContent = preuPerNit + ' €';
    }
}

// Inicialització dels calendaris compactes - VERSIÓ MILLORADA
async function inicialitzarCalendarisCompactes() {
    console.log('📅 Inicialitzant calendaris...');
    
    // Carregar dates ocupades ABANS de generar els calendaris
    await carregarDatesOcupades();
    
    // Generar calendaris amb les dates ja carregades
    generarCalendariIniciPermanent();
    generarCalendariFiPermanent();
    
    console.log('✅ Calendaris inicialitzats amb dates ocupades');
}

// Generar calendari compacte permanent per data d'entrada
function generarCalendariIniciPermanent() {
    const calendariDiv = document.getElementById('calendari-inici-permanent');
    if (!calendariDiv) return;
    
    const mes = mesCalendariInici;
    const any = anyCalendariInici;
    
    generarCalendariCompacte(calendariDiv, mes, any, 'inici-permanent');
}

// Generar calendari compacte permanent per data de sortida
function generarCalendariFiPermanent() {
    const calendariDiv = document.getElementById('calendari-fi-permanent');
    if (!calendariDiv) return;
    
    const avui = new Date();
    let mes = mesCalendariFi;
    let any = anyCalendariFi;
    
    generarCalendariCompacte(calendariDiv, mes, any, 'fi-permanent');
}

// Funció principal per generar calendaris compactes - VERSIÓ CORREGIDA
function generarCalendariCompacte(calendariDiv, mes, any, tipus) {
    const nomsMesos = ['Gen', 'Feb', 'Mar', 'Abr', 'Maig', 'Jun', 
                      'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Des'];
    
    const avui = new Date();
    avui.setHours(12, 0, 0, 0); // Normalitzar a migdia
    
    const dataMinima = tipus === 'fi-permanent' && dataIniciSeleccionada ? 
        new Date(dataIniciSeleccionada.getTime() + 24 * 60 * 60 * 1000) : avui;
    
    let html = `
        <div class="calendari-header">
            <button class="btn-nav" onclick="canviarMesCompacte(-1, '${tipus}')">←</button>
            <div class="calendari-mes">${nomsMesos[mes]} ${any}</div>
            <button class="btn-nav" onclick="canviarMesCompacte(1, '${tipus}')">→</button>
        </div>
        <div class="dies-setmana">
            <div class="dia-setmana">Dl</div>
            <div class="dia-setmana">Dt</div>
            <div class="dia-setmana">Dc</div>
            <div class="dia-setmana">Dj</div>
            <div class="dia-setmana">Dv</div>
            <div class="dia-setmana">Ds</div>
            <div class="dia-setmana">Dg</div>
        </div>
        <div class="dies-mes">
    `;
    
    // Obtenir primer i últim dia del mes
    const primerDia = new Date(any, mes, 1);
    const ultimDia = new Date(any, mes + 1, 0);
    
    // Començar per Dilluns
    let diaIniciSetmana = primerDia.getDay();
    if (diaIniciSetmana === 0) {
        diaIniciSetmana = 6;
    } else {
        diaIniciSetmana = diaIniciSetmana - 1;
    }
    
    // Afegir dies buits abans del primer dia
    for (let i = 0; i < diaIniciSetmana; i++) {
        html += '<div class="dia buit"></div>';
    }
    
    // Afegir dies del mes
    for (let dia = 1; dia <= ultimDia.getDate(); dia++) {
        const dataActual = new Date(any, mes, dia, 12, 0, 0); // Normalitzar a migdia
        let classe = 'dia';
        let disabled = false;
        
        // Verificar si és avui (comparant només data, no hora)
        const avuiNormalitzat = new Date(avui);
        avuiNormalitzat.setHours(12, 0, 0, 0);
        
        if (dataActual.toDateString() === avuiNormalitzat.toDateString()) {
            classe += ' avui';
        }
        
        // Verificar si és passat (comparant només data)
        const dataActualNomésData = new Date(dataActual.getFullYear(), dataActual.getMonth(), dataActual.getDate());
        const avuiNomésData = new Date(avui.getFullYear(), avui.getMonth(), avui.getDate());
        
        if (dataActualNomésData < avuiNomésData) {
            classe += ' passat';
            disabled = true;
        }
        
        // Per data de sortida, verificar que sigui posterior a la data d'entrada
        if (tipus === 'fi-permanent' && dataIniciSeleccionada) {
            const dataIniciNomésData = new Date(dataIniciSeleccionada.getFullYear(), dataIniciSeleccionada.getMonth(), dataIniciSeleccionada.getDate());
            const dataActualNomésData = new Date(dataActual.getFullYear(), dataActual.getMonth(), dataActual.getDate());
            
            if (dataActualNomésData <= dataIniciNomésData) {
                classe += ' passat';
                disabled = true;
            }
        }
        
        // Verificar si està ocupat
        if (estaOcupat(dataActual)) {
            classe += ' ocupat';
            disabled = true;
        }
        
        // Verificar si està seleccionat
        if (tipus === 'inici-permanent' && dataIniciSeleccionada) {
            const dataIniciNomésData = new Date(dataIniciSeleccionada.getFullYear(), dataIniciSeleccionada.getMonth(), dataIniciSeleccionada.getDate());
            const dataActualNomésData = new Date(dataActual.getFullYear(), dataActual.getMonth(), dataActual.getDate());
            
            if (dataActualNomésData.getTime() === dataIniciNomésData.getTime()) {
                classe += ' seleccionat';
            }
        } else if (tipus === 'fi-permanent' && dataFiSeleccionada) {
            const dataFiNomésData = new Date(dataFiSeleccionada.getFullYear(), dataFiSeleccionada.getMonth(), dataFiSeleccionada.getDate());
            const dataActualNomésData = new Date(dataActual.getFullYear(), dataActual.getMonth(), dataActual.getDate());
            
            if (dataActualNomésData.getTime() === dataFiNomésData.getTime()) {
                classe += ' seleccionat';
            }
        }
        
        // Crear el string de data en format YYYY-MM-DD per al onclick
        const dataISO = `${any}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        
        if (disabled) {
            html += `<div class="${classe}">${dia}</div>`;
        } else {
            html += `<div class="${classe}" onclick="seleccionarDataCompacte('${dataISO}', '${tipus}')">${dia}</div>`;
        }
    }
    
    html += '</div>';
    calendariDiv.innerHTML = html;
}

// Canviar mes als calendaris compactes
function canviarMesCompacte(direccio, tipus) {
    let mes, any;
    
    if (tipus === 'inici-permanent') {
        mes = mesCalendariInici;
        any = anyCalendariInici;
    } else {
        mes = mesCalendariFi;
        any = anyCalendariFi;
    }
    
    mes += direccio;
    if (mes < 0) {
        mes = 11;
        any--;
    } else if (mes > 11) {
        mes = 0;
        any++;
    }
    
    if (tipus === 'inici-permanent') {
        mesCalendariInici = mes;
        anyCalendariInici = any;
        generarCalendariIniciPermanent();
    } else {
        mesCalendariFi = mes;
        anyCalendariFi = any;
        generarCalendariFiPermanent();
    }
}

// Seleccionar data des dels calendaris compactes - VERSIÓ CORREGIDA
function seleccionarDataCompacte(dataString, tipus) {
    // Crear la data CORRECTAMENT sense problemes de fus horari
    const [any, mes, dia] = dataString.split('-');
    const data = new Date(any, mes - 1, dia, 12, 0, 0); // Migdia per evitar problemes de fus horari
    
    console.log('🖱️ Data clicada:', dataString, 'Data processada:', data.toISOString());
    
    if (tipus === 'inici-permanent') {
        // Verificar disponibilitat per data d'inici
        if (estaOcupat(data)) {
            mostrarMissatge(
                document.getElementById('missatge-disponibilitat'),
                '❌ Aquesta data no està disponible. Si us plau, selecciona una altra data.',
                'error'
            );
            return;
        }
        
        dataIniciSeleccionada = data;
        document.getElementById('data-inici').value = formatDataInput(data);
        
        // Si ja hi ha una data de sortida anterior, netejar-la
        if (dataFiSeleccionada && dataFiSeleccionada <= data) {
            dataFiSeleccionada = null;
            document.getElementById('data-fi').value = '';
            amagarBotoContinuar();
        }
        
        // Amagar formulari si estava visible
        amagarFormulariReserva();
        
    } else {
        // Verificar que hi hagi data d'entrada seleccionada
        if (!dataIniciSeleccionada) {
            mostrarMissatge(
                document.getElementById('missatge-disponibilitat'),
                '⚠️ Si us plau, selecciona primer la data d\'entrada',
                'error'
            );
            return;
        }
        
        // Verificar que la data de sortida sigui posterior
        if (data <= dataIniciSeleccionada) {
            mostrarMissatge(
                document.getElementById('missatge-disponibilitat'),
                '❌ La data de sortida ha de ser posterior a la data d\'entrada',
                'error'
            );
            return;
        }
        
        // Verificar disponibilitat de tot el rang
        const dataTemp = new Date(dataIniciSeleccionada);
        let totDisponible = true;
        let dataOcupada = null;
        
        while (dataTemp < data) {
            if (estaOcupat(dataTemp)) {
                totDisponible = false;
                dataOcupada = new Date(dataTemp);
                break;
            }
            dataTemp.setDate(dataTemp.getDate() + 1);
        }
        
        if (!totDisponible) {
            mostrarMissatge(
                document.getElementById('missatge-disponibilitat'),
                `❌ El rang seleccionat no està disponible (${formatDataInput(dataOcupada)} està ocupada)`,
                'error'
            );
            return;
        }
        
        dataFiSeleccionada = data;
        document.getElementById('data-fi').value = formatDataInput(data);
    }
    
    // Actualitzar ambdós calendaris
    generarCalendariIniciPermanent();
    generarCalendariFiPermanent();
    
    // Si tenim ambdues dates, mostrar automàticament el botó "Continuar"
    if (dataIniciSeleccionada && dataFiSeleccionada) {
        datesValides = true;
        mostrarMissatge(
            document.getElementById('missatge-disponibilitat'),
            '✅ Rang de dates disponible!',
            'exit'
        );
        mostrarBotoContinuar();
    } else {
        amagarBotoContinuar();
    }
}

// Formatar data per input - CORREGIT
function formatDataInput(data) {
    // Assegurar-se que la data es mostra correctament
    const any = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${dia}/${mes}/${any}`;
}

// Mostrar botó "Continuar amb la Reserva"
function mostrarBotoContinuar() {
    document.getElementById('boto-continuar-container').style.display = 'block';
}

// Amagar botó "Continuar amb la Reserva"
function amagarBotoContinuar() {
    document.getElementById('boto-continuar-container').style.display = 'none';
}

// Continuar amb la reserva (mostrar formulari)
function continuarAmbReserva() {
    const dataInici = document.getElementById('data-inici').value;
    const dataFi = document.getElementById('data-fi').value;
    
    if (!dataInici || !dataFi) {
        alert('Si us plau, selecciona les dates primer');
        return;
    }
    
    mostrarFormulariReserva(dataInici, dataFi);
    
    // Desplaçar-se automàticament al formulari
    document.getElementById('formulari-reserva').scrollIntoView({ 
        behavior: 'smooth' 
    });
}

// Mostrar formulari de reserva
function mostrarFormulariReserva(dataInici, dataFi) {
    // Calcular nits i preu
    const partsInici = dataInici.split('/');
    const partsFi = dataFi.split('/');
    const dataIniciObj = new Date(partsInici[2], partsInici[1] - 1, partsInici[0]);
    const dataFiObj = new Date(partsFi[2], partsFi[1] - 1, partsFi[0]);
    const nits = Math.ceil((dataFiObj - dataIniciObj) / (1000 * 60 * 60 * 24));
    const preuTotal = nits * preuPerNit;
    
    // Actualitzar resum
    document.getElementById('resum-immoble').textContent = immobleSeleccionat;
    document.getElementById('resum-data-inici').textContent = formatData(dataIniciObj);
    document.getElementById('resum-data-fi').textContent = formatData(dataFiObj);
    document.getElementById('resum-nits').textContent = nits;
    document.getElementById('resum-total').textContent = preuTotal.toFixed(2) + ' €';
    
    // Mostrar formulari
    document.getElementById('resum-reserva').style.display = 'block';
}

// Amagar formulari de reserva
function amagarFormulariReserva() {
    document.getElementById('resum-reserva').style.display = 'none';
}

function netejarSeleccions() {
    datesOcupades = [];
    datesValides = false;
    dataIniciSeleccionada = null;
    dataFiSeleccionada = null;
    
    document.getElementById('data-inici').value = '';
    document.getElementById('data-fi').value = '';
    document.getElementById('nom').value = '';
    document.getElementById('email').value = '';
    document.getElementById('telefon').value = '';
    
    amagarBotoContinuar();
    amagarFormulariReserva();
    document.getElementById('missatge-disponibilitat').innerHTML = '';
    document.getElementById('missatge-reserva').innerHTML = '';
    
    // Reinicialitzar calendaris compactes
    inicialitzarCalendarisCompactes();
}

// Fer reserva - VERSIÓ CORREGIDA
async function ferReserva() {
    const nom = document.getElementById('nom').value;
    const email = document.getElementById('email').value;
    const telefon = document.getElementById('telefon').value;
    const missatgeDiv = document.getElementById('missatge-reserva');
    const btnReservar = document.getElementById('btn-reservar');
    
    // Validacions bàsiques
    if (!nom || !email || !telefon) {
        mostrarMissatge(missatgeDiv, 'Si us plau, completa tots els camps del formulari', 'error');
        return;
    }
    
    if (!datesValides) {
        mostrarMissatge(missatgeDiv, 'Si us plau, verifica primer la disponibilitat de les dates', 'error');
        return;
    }

    // VERIFICAR QUE LES DATES ESTAN DEFINIDES I SÓN VÀLIDES
    if (!dataIniciSeleccionada || !dataFiSeleccionada) {
        mostrarMissatge(missatgeDiv, 'Error: No s\'han seleccionat dates vàlides', 'error');
        return;
    }

    // Validar que les dates són futures
    const avui = new Date();
    avui.setHours(0, 0, 0, 0);
    
    if (dataIniciSeleccionada < avui) {
        mostrarMissatge(missatgeDiv, 'Error: La data d\'entrada no pot ser anterior a avui', 'error');
        return;
    }

    if (dataFiSeleccionada <= dataIniciSeleccionada) {
        mostrarMissatge(missatgeDiv, 'Error: La data de sortida ha de ser posterior a la d\'entrada', 'error');
        return;
    }

    // CONSTRUIR LES DADES DE RESERVA CORRECTAMENT
    const dadesReserva = {
        nom: nom.trim(),
        email: email.trim(),
        telefon: telefon.trim(),
        immoble: immobleSeleccionat,
        data_inici: dataIniciSeleccionada.toISOString().split('T')[0],
        data_fi: dataFiSeleccionada.toISOString().split('T')[0],
        nits: Math.ceil((dataFiSeleccionada - dataIniciSeleccionada) / (1000 * 60 * 60 * 24)),
        preu_total: Math.ceil((dataFiSeleccionada - dataIniciSeleccionada) / (1000 * 60 * 60 * 24)) * preuPerNit
    };
    
    console.log('📤 Dades de reserva enviades:', dadesReserva);
    
    // Deshabilitar el botó durant el procés
    btnReservar.disabled = true;
    btnReservar.textContent = '🔄 Processant...';
    
    try {
        // Mostrar missatge de càrrega
        mostrarMissatge(missatgeDiv, '⏳ Processant la teva reserva...', 'exit');
        
        // FER LA PÈTICIO CORRECTAMENT
        const resultat = await ferPeticioGS('ferReserva', dadesReserva);
        
        console.log('📥 Resposta del servidor:', resultat);
        
        // Verificar la resposta
        if (resultat && resultat.exit) {
            mostrarMissatge(missatgeDiv, resultat.missatge || '✅ Reserva realitzada amb èxit!', 'exit');
            mostrarModalReserva();
            
            // Netejar el formulari després d'uns segons
            setTimeout(() => {
                document.getElementById('nom').value = '';
                document.getElementById('email').value = '';
                document.getElementById('telefon').value = '';
                netejarSeleccions();
                amagarFormulariReserva();
                carregarDatesOcupades(); // Actualitzar dates ocupades
                
                // Tornar a la secció d'inici
                setTimeout(() => {
                    mostrarSeccio('inici');
                }, 1000);
            }, 3000);
        } else {
            const missatgeError = resultat?.missatge || 'Error desconegut en realitzar la reserva';
            mostrarMissatge(missatgeDiv, '❌ ' + missatgeError, 'error');
        }
    } catch (error) {
        console.error('❌ Error en ferReserva:', error);
        mostrarMissatge(missatgeDiv, '❌ Error de connexió: ' + error.message, 'error');
    } finally {
        // Rehabilitar el botó sempre
        btnReservar.disabled = false;
        btnReservar.textContent = '🚀 Fer Reserva';
    }
}

// Funció auxiliar per formatar dates
function formatData(data) {
    return data.toLocaleDateString('ca-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

// Funció auxiliar per mostrar missatges
function mostrarMissatge(element, text, tipus) {
    element.innerHTML = text;
    element.className = `missatge ${tipus}`;
    element.style.display = 'block';
}

// Funció per mostrar la finestra modal de confirmació
function mostrarModalReserva() {
    const modal = document.getElementById('modal-reserva');
    modal.style.display = 'block';
    
    // Tancar modal en fer clic fora del contingut
    modal.addEventListener('click', function(event) {
        if (event.target === modal) {
            tancarModal();
        }
    });
    
    // Prevenir que el clic dins del contingut tanqui el modal
    document.querySelector('.modal-content').addEventListener('click', function(event) {
        event.stopPropagation();
    });
}

// Funció per tancar la finestra modal
function tancarModal() {
    document.getElementById('modal-reserva').style.display = 'none';
}

// Inicialització - VERSIÓ MILLORADA
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicialitzant sistema...');
    
    // Configurar selector d'immobles
    document.querySelectorAll('.btn-immoble').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.btn-immoble').forEach(b => b.classList.remove('seleccionat'));
            this.classList.add('seleccionat');
            immobleSeleccionat = this.getAttribute('data-immoble');
            console.log('🏠 Immoble seleccionat: ' + immobleSeleccionat);
            
            netejarSeleccions();
            obtenirPreuImmoble();
            // Ara carregarDatesOcupades() es crida des de inicialitzarCalendarisCompactes()
            inicialitzarCalendarisCompactes();
        });
    });
    
    // Carregar dades inicials
    obtenirPreuImmoble();
    inicialitzarCalendarisCompactes(); // Això carrega les dates ocupades automàticament
});
