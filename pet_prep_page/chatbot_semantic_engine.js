/**
 * MOTOR SEMÁNTICO CLÍNICO INTELIGENTE v2.1 — CHATBOT ENFERMERÍA PET/CT (GALARIA · SERGAS)
 *
 * Mejoras incluidas:
 * 1. Normalización ortográfica avanzada y tolerancia a errores de escritura móvil (typos).
 * 2. Comprensión bilingüe Castellano + Galego (xaxún, auga, almorzo, onde, febre, pílulas, etc.).
 * 3. Detección Multi-Intención: responde varias dudas formuladas en una misma frase y detecta
 *    combinaciones de riesgo (ej. "tomar pastilla con café/leche/zumo").
 * 4. Catálogo clínico ampliado (28 dominios clínicos de Medicina Nuclear adaptados por protocolo).
 */
(function () {
  'use strict';

  // 1. DICCIONARIO DE CORRECCIÓN ORTOGRÁFICA Y EQUIVALENCIAS GALEGO -> CANÓNICO SEMÁNTICO
  const TYPO_AND_GALICIAN_REPLACEMENTS = [
    // Ayuno / Xaxún
    [/\b(xaxun|xaxuns|xaxunar|hayuno|alluno|ayunar|aiuno|ayunoo|sen comer|sin comer)\b/g, 'ayuno'],
    // Agua / Auga
    [/\b(auga|auguita|aguita|awa|hidratarme|hidratacion)\b/g, 'agua'],
    // Comida / Desayuno / Cena (Galego + Typos)
    [/\b(almorzo|almorzar|desallunar|desalluno|desayunar|desayuno)\b/g, 'desayunar'],
    [/\b(xantar|almorzar mediodia)\b/g, 'almorzar'],
    [/\b(cea|cear|senar)\b/g, 'cenar'],
    [/\b(despois|logo|ao sair|ao rematar|cando remate|cando acabe|tras acabar)\b/g, 'despues'],
    [/\b(antes de vir|antes de ir|antes da proba)\b/g, 'antes'],
    // Medicación / Pílulas / Fármacos frecuentes
    [/\b(medisina|medicina|medicinas|pilula|pilulas|pastiyas|pastiya|comprimido|comprimidos)\b/g, 'pastilla'],
    [/\b(sintron|sintrom|acenocumarol|adiro|aspirina|eliquis|xarelto|pradaxa)\b/g, 'anticoagulante'],
    [/\b(parasetamol|paracetamol|ibuprofeno|nolotil|metamizol|enantyum|tramadol|calmante|analxesico|analgesico)\b/g, 'analgesico pastilla'],
    [/\b(omeprazol|pantoprazol|protector estomago|almax)\b/g, 'pastilla'],
    [/\b(eutirox|levotiroxina|tiroides)\b/g, 'tiroides pastilla'],
    [/\b(lorazepam|orfidal|lexatin|diazepam|valium|alprazolam|trankimazin)\b/g, 'ansiolitico pastilla'],
    // Diabetes / Azucre
    [/\b(diabetis|diabete|diabetico|diabetica|azucre|azucar|asucre|glicemia|glusemia)\b/g, 'diabetes glucemia'],
    [/\b(dianben|metformina|jardiance|forxiga|ozempic|victoza|lantus|toujeo|novorapid|humalog)\b/g, 'antidiabetico insulina'],
    // Ubicación / Hospital do Meixoeiro
    [/\b(onde|adonde|ubicasion|enderezo|direccion)\b/g, 'donde'],
    [/\b(meijoeiro|mexoeiro|meixoeiro|hospital meixoeiro|chuv)\b/g, 'meixoeiro'],
    [/\b(andar|soto|sotano)\b/g, 'planta'],
    [/\b(chegar|ir ata)\b/g, 'llegar'],
    // Claustrofobia / Medo
    [/\b(clautrofobia|claustrofobia|claustrofobico)\b/g, 'claustrofobia'],
    [/\b(medo|temor|pechado|pechada|angustia|ansiedade)\b/g, 'miedo cerrado'],
    // Radioprotección / Nenos / Embarazo
    [/\b(raioproteccion|radioproteccion|radiasion|radioactividade|radiactividad)\b/g, 'radioproteccion'],
    [/\b(neno|nenos|nena|nenas|cativo|cativos|crianza|neto|netos|nieto|nietos|sobrino)\b/g, 'nino'],
    [/\b(xestante|encinta)\b/g, 'embarazada'],
    // Contraste / Alergia / Riñón
    [/\b(contrastre|contraste|yodo|iodo|yodado)\b/g, 'contraste'],
    [/\b(alerxia|alergia|alerxico|alergico)\b/g, 'alergia'],
    [/\b(rinon|rinones|ril|riles|creatinina|filtrado|insuficiencia renal)\b/g, 'renal'],
    // Fiebre / Gripe / Infección / Vacunas
    [/\b(febre|fiebre|febricula|temperatura alta|calentura)\b/g, 'fiebre'],
    [/\b(arrefriado|resfriado|catarro|constipado|gripe|covid|coronavirus|tuse|tos|mocos|infeccion|antibiotico|amoxicilina|vacina|vacuna)\b/g, 'infeccion_respiratoria'],
    // Lactancia / Regla / Embarazo propio
    [/\b(aleitamento|lactancia|dar el pecho|dar o peito|leche materna|leite materno|amamantar)\b/g, 'lactancia'],
    [/\b(regla|menstruacion|periodo|menstruando)\b/g, 'menstruacion'],
    // Sonda / Ostomía / Pañal
    [/\b(ostomia|colostomia|ileostomia|urostomia|bolsa de orina|sonda vesical|sonda|panal|compresa|incontinencia)\b/g, 'sonda_ostomia'],
    // Aparcamiento / Transporte / Conducir
    [/\b(aparcar|aparcamento|aparcamiento|parking|estacionar)\b/g, 'aparcar'],
    [/\b(conducir|coche|auto|autobus|bus|vitrasa|taxi|ambulancia)\b/g, 'transporte_conducir'],
    // Frío / Dolor camilla
    [/\b(frio|friolero|abrigo|abrigado|manta|grasa parda)\b/g, 'frio_sala'],
    [/\b(dolor|dor|espalda|costas|lumbago|ciatica|tumbado|acostado|camilla)\b/g, 'dolor_camilla'],
    // Justificante / Trabajo
    [/\b(xustificante|justificante|justificante medico|traballo|trabajo|empresa|baja laboral)\b/g, 'justificante'],
    // Saludos / Agradecimientos en galego
    [/\b(boas|ola|bos dias|boas tardes|boas noites)\b/g, 'hola'],
    [/\b(grazas|moitas grazas|gracinas)\b/g, 'gracias']
  ];

  function normalizeSemanticText(rawText) {
    if (!rawText) return '';
    let s = String(rawText)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[¿?¡!.,;:()"'«»\-]/g, ' ')
      .replace(/([abdfghijkmnopqstuvwxyz])\1+/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();

    for (let i = 0; i < TYPO_AND_GALICIAN_REPLACEMENTS.length; i++) {
      const [regex, replacement] = TYPO_AND_GALICIAN_REPLACEMENTS[i];
      s = s.replace(regex, replacement);
    }
    return s.replace(/\s+/g, ' ').trim();
  }

  function detectProtocolProfile() {
    const path = (window.location.pathname || '').toLowerCase();
    const title = (document.title || '').toLowerCase();
    if (path.includes('endocarditis') || title.includes('endocarditis')) {
      return {
        code: 'ENDOCARDITIS',
        serverStudyType: 'FDG_ENDOCARDITIS',
        title: 'PET FDG Endocarditis / Infección Cardíaca',
        fastingHours: 16,
        uptakeMin: 90,
        isNonFdg: false,
        isDiabetic: false
      };
    }
    if (path.includes('vasculitis') || title.includes('vasculitis')) {
      return {
        code: 'VASCULITIS',
        serverStudyType: 'FDG_VASCULITIS',
        title: 'PET FDG Vasculitis de Grandes Vasos',
        fastingHours: 6,
        uptakeMin: 90,
        isNonFdg: false,
        isDiabetic: false
      };
    }
    if (path.includes('contraste') || title.includes('contraste')) {
      return {
        code: 'FDG_CONTRASTE',
        serverStudyType: 'FDG_CONTRASTE',
        title: 'PET FDG con Contraste Yodado IV',
        fastingHours: 6,
        uptakeMin: 60,
        isNonFdg: false,
        isDiabetic: false
      };
    }
    if (path.includes('neuro') || title.includes('neuro') || title.includes('cerebr')) {
      return {
        code: 'NEURO',
        serverStudyType: 'FDG_NEUROLOGICO',
        title: 'PET FDG Neurológico / Cerebral',
        fastingHours: 6,
        uptakeMin: 40,
        isNonFdg: false,
        isDiabetic: false
      };
    }
    if (path.includes('colina') || path.includes('psma') || path.includes('dotatoc') || path.includes('paratiroides')) {
      let tName = 'PET/CT Especializado (Colina / PSMA / DOTATOC)';
      let srvType = 'PSMA';
      if (path.includes('colina') || path.includes('paratiroides')) {
        tName = 'PET/CT 18F-Colina';
        srvType = 'F18_COLINA';
      } else if (path.includes('psma')) {
        tName = 'PET/CT PSMA';
        srvType = 'PSMA';
      } else if (path.includes('dotatoc')) {
        tName = 'PET/CT 68Ga-DOTATOC';
        srvType = 'GA68_DOTATOC';
      }
      return {
        code: 'NON_FDG',
        serverStudyType: srvType,
        title: tName,
        fastingHours: 4,
        uptakeMin: 60,
        isNonFdg: true,
        isDiabetic: false
      };
    }
    const isDiab = (path.includes('indexfdg.html') || path.includes('diabetico')) && !path.includes('nodiabetico');
    return {
      code: isDiab ? 'FDG_DIABETICO' : 'FDG_ONCOLOGICO',
      serverStudyType: isDiab ? 'FDG_DIABETICO' : 'FDG_ONCOLOGICO',
      title: isDiab ? 'PET FDG Oncológico / Inflamatorio (Diabético)' : 'PET FDG Oncológico / Inflamatorio',
      fastingHours: 6,
      uptakeMin: 60,
      isNonFdg: false,
      isDiabetic: isDiab
    };
  }

  function calcularHoraInicioAyuno(horaCitaStr, horasAyuno = 6) {
    if (!horaCitaStr) return null;
    const match = String(horaCitaStr).match(/(\d{1,2}):(\d{2})/);
    if (!match) return null;
    const h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    if (isNaN(h) || isNaN(m)) return null;
    const totalMin = ((h * 60 + m) - (horasAyuno * 60) + 1440) % 1440;
    const fh = String(Math.floor(totalMin / 60)).padStart(2, '0');
    const fm = String(totalMin % 60).padStart(2, '0');
    return `${fh}:${fm}`;
  }

  function buildSmartBotResponse(rawInput, options = {}) {
    const cleanText = normalizeSemanticText(rawInput);
    const profile = detectProtocolProfile();
    const studyTitle = options.studyTitle || profile.title;

    let pInf = { hora: '08:20', fecha: '', nombre: '' };
    if (typeof window.getPatientCitationInfo === 'function') {
      pInf = window.getPatientCitationInfo() || pInf;
    } else if (window.PET_CHAT_HUMAN_ENGINE && typeof window.PET_CHAT_HUMAN_ENGINE.getPatientInfo === 'function') {
      const hInf = window.PET_CHAT_HUMAN_ENGINE.getPatientInfo();
      pInf = { hora: hInf.hora || '08:20', fecha: hInf.fecha || '', nombre: hInf.firstName || '' };
    }
    const pName = pInf.nombre || (typeof window.getPatientFirstName === 'function' ? window.getPatientFirstName() : (sessionStorage.getItem('pet_patient_name') || ''));
    const saludoNombre = pName ? `Mira **${pName}**, ` : '';
    const pH = pInf.hora || '08:20';
    const pF = pInf.fecha || '';
    const horaLimiteAyuno = calcularHoraInicioAyuno(pH, profile.fastingHours);

    const isDespues = /\b(despues|tras|luego|al terminar|al salir|cuando acabe|al acabar|una vez hecho|cuando termine|tarde|noche siguiente)\b/.test(cleanText);
    const matchedBlocks = [];

    // -------------------------------------------------------------------------
    // DETECCIÓN DE COMBINACIÓN CRÍTICA: PASTILLAS + CAFÉ / LECHE / ZUMO
    // -------------------------------------------------------------------------
    const asksMedication = /\b(medicacion|pastilla|tension|hipertension|corazon|tiroides|anticoagulante|ansiolitico|tratamiento|farmaco|analgesico)\b/.test(cleanText);
    const asksForbiddenDrink = /\b(cafe|infusion|descafeinado|cola|cacao|te|leche|zumo|refresco|batido|aquarius)\b/.test(cleanText);

    if (asksMedication && asksForbiddenDrink && !isDespues) {
      matchedBlocks.push(
        `⚠️ **¡Atención muy importante sobre cómo tomar tu medicación!**\n\n` +
        `${saludoNombre}**SÍ debes tomar tu pastilla habitual**, pero **NUNCA acompañada de café, leche, zumo ni infusiones**. Tómala **exclusivamente con agua pura sola**, ya que cualquier otra bebida rompe el ayuno metabólico e invalida el estudio PET.`
      );
    }

    // 1. LUGAR, HORA DE CITA Y CÓMO LLEGAR
    if (/\b(donde|lugar|hospital|meixoeiro|planta|ubicacion|sitio|como llegar|a que hora|que hora|hora estoy|mi cita|hora es|hora de la cita|horario|recepcion|mostrador)\b/.test(cleanText)) {
      const sal = pName ? `Estimado/a **${pName}**, ` : '';
      matchedBlocks.push(
        `📍 **Lugar, Ubicación y Hora de tu Cita**:\n\n` +
        `${sal}la prueba se realiza en el **Hospital do Meixoeiro (Vigo)**, en la **Planta -1, justo al lado del servicio de Medicina Nuclear** (Unidad PET-CT Galaria).\n\n` +
        `🕒 **Tu Hora de Citación**:\n` +
        `• Estás citado/a a las **${pH} h**${pF ? ` del día **${pF}**` : ''}.\n` +
        `• Te recomendamos llegar con **10 a 15 minutos de antelación** para realizar la admisión con tranquilidad.\n\n` +
        `🚶 **Cómo llegar dentro del hospital**:\n` +
        `Entra por la puerta principal del Hospital do Meixoeiro, baja en ascensor o escaleras a la **Planta -1** y sigue los carteles de **Medicina Nuclear / PET-CT**.`
      );
    }

    // 2. APARCAMIENTO, TRANSPORTE Y CONDUCIR TRAS LA PRUEBA
    if (/\b(aparcar|transporte_conducir|parking|coche|conducir|autobus|vitrasa|taxi|ambulancia)\b/.test(cleanText)) {
      matchedBlocks.push(
        `🚗 **Aparcamiento, Transporte y Conducción**:\n\n` +
        `• **¿Puedo conducir al salir de la prueba?**: **Sí, puedes conducir tu coche con total normalidad** al terminar el PET-CT. El radiofármaco no produce somnolencia, mareo ni altera los reflejos *(salvo que nos hayas solicitado expresamente un ansiolítico/relajante muscular por claustrofobia, en cuyo caso sí deberás venir con un acompañante que conduzca)*.\n` +
        `• **Dónde aparcar en el Hospital do Meixoeiro**: El hospital dispone de zonas de aparcamiento exterior gratuito en el recinto y áreas próximas a la entrada principal. Te aconsejamos venir con unos minutos extra por si hay alta ocupación a primera hora de la mañana.\n` +
        `• **Autobús y Taxi**: Las líneas urbanas de **Vitrasa** (como las líneas C3, 12B, 15C y H) y la parada de taxis dejan justo en la entrada principal del Hospital do Meixoeiro.`
      );
    }

    // 3. ALCOHOL
    if (/\b(alcohol|cerveza|vino|copa|licor|cubata|vermu|bebida alcoholica|chupito|sidra)\b/.test(cleanText)) {
      if (isDespues) {
        matchedBlocks.push(
          `🍷 **Consumo de alcohol después de la prueba**:\n\n` +
          `${saludoNombre}**lo más prudente y seguro es evitar el alcohol durante las primeras 6 horas tras salir del escáner**.\n\n` +
          `• Durante esas primeras 6 horas tu prioridad es beber **abundante agua pura** (1 a 1.5 litros) para que los riñones eliminen rápidamente el trazador por la orina.\n` +
          `• El alcohol deshidrata y retrasa esa eliminación. Pasadas las **6 horas de radioprotección**, habiendo bebido agua y orinado varias veces, puedes retomar un consumo moderado si tu médico lo permite.`
        );
      } else {
        matchedBlocks.push(
          `🚫 **Alcohol antes de la prueba (24-48h previas)**:\n\n` +
          `${saludoNombre}**no debes beber nada de alcohol (ni cerveza, ni vino, ni licores) en las 24 a 48 horas previas al PET**.\n\n` +
          `El alcohol altera el metabolismo hepático y muscular y puede distorsionar la distribución del radiofármaco en las imágenes.`
        );
      }
    }

    // 4. CAFÉ, TÉ E INFUSIONES
    if (/\b(cafe|infusion|energetica|descafeinado|cola|cacao|redbull|monster|te|tes|manzanilla|tila|poleo|mate)\b/.test(cleanText)) {
      if (isDespues) {
        matchedBlocks.push(
          `☕ **Café o infusiones después de la prueba**:\n\n` +
          `¡Sí! **Nada más recibir el alta tras el escáner puedes tomar tu café, descafeinado o infusión con normalidad**. Recuerda acompañarlo de **abundante agua pura** durante el resto del día para eliminar el radiofármaco.`
        );
      } else {
        matchedBlocks.push(
          `☕ **Café, té e infusiones antes de la prueba (Prohibidos en el ayuno)**:\n\n` +
          `${saludoNombre}durante las ${profile.fastingHours} horas de ayuno **no puedes tomar café (ni solo ni descafeinado), ni té, ni manzanilla, ni tila, ni ninguna infusión**.\n\n` +
          `La cafeína, la teína y las bebidas calientes estimulan el sistema nervioso y activan la 'grasa parda' del cuello y tórax, interfiriendo en la imagen del PET. **Solo puedes beber agua pura sola**.`
        );
      }
    }

    // 5. LECHE, ZUMOS Y REFRESCOS
    if (/\b(leche|zumo|refresco|aquarius|gatorade|fanta|cocacola|batido|horchata|soja|avena|caldo)\b/.test(cleanText)) {
      if (isDespues) {
        matchedBlocks.push(
          `🥤 **Leche, zumos o refrescos al terminar**:\n\n` +
          `Al salir del hospital puedes volver a tomar leche, zumos o refrescos libremente, priorizando siempre beber también **1 a 1.5 litros de agua pura** para limpiar el trazador por la orina.`
        );
      } else {
        matchedBlocks.push(
          `🚫 **Leche, zumos, caldos y refrescos durante el ayuno**:\n\n` +
          `Durante las ${profile.fastingHours} horas previas **no está permitido tomar leche (tampoco sin lactosa ni vegetal), zumos, caldos ni refrescos (tampoco Zero o Light)**.\n\n` +
          `Contienen azúcares o edulcorantes que disparan la insulina y alteran el estudio. Durante el ayuno **solo está permitida el agua pura**.`
        );
      }
    }

    // 6. COMER DESPUÉS DE LA PRUEBA
    const isComidaPalabra = /\b(comer|comida|aliment|desayunar|almorzar|cenar|merendar|tentempie|bocadillo|fruta|galleta|lo que quiera|lo que me apetezca)\b/.test(cleanText);
    if ((isComidaPalabra && isDespues) || cleanText.includes('comer lo que quiera') || cleanText.includes('puedo comer lo que quiera')) {
      matchedBlocks.push(
        `🥪 **Comer después de la prueba: ¡puedes comer lo que quieras!**:\n\n` +
        `${saludoNombre}**en cuanto el técnico revise las imágenes y te demos el alta para marcharte, puedes comer y desayunar con total libertad**.\n\n` +
        `• **Sin restricciones**: Termina tanto el ayuno como cualquier restricción dietética previa. Puedes tomar un bocadillo, fruta, café con leche, comida normal o lo que te apetezca.\n` +
        `• 💡 **Consejo práctico**: Trae en tu bolso o mochila algo de comer (un sándwich, galletas o fruta) para tomarlo nada más salir del servicio de Medicina Nuclear.`
      );
    }

    // 7. MEDICACIÓN CRÓNICA Y ANALGÉSICOS
    if (asksMedication) {
      matchedBlocks.push(
        `💊 **Tus pastillas y medicación habitual**:\n\n` +
        `${saludoNombre}**SÍ debes tomar tu medicación crónica habitual** (tensión arterial, corazón, tiroides/Eutirox, colesterol, protector gástrico, analgésicos o anticoagulantes/Sintrom) a tu hora normal, acompañada **únicamente de agua pura sola**.\n\n` +
        `• **Excepciones**:\n` +
        `  1. Si eres **diabético/a**, la insulina y los antidiabéticos siguen una pauta específica con el ayuno.\n` +
        `  2. Evita jarabes para la tos con azúcar o sobres efervescentes edulcorados en las horas de ayuno.`
      );
    }

    // 8. CONTRASTE YODADO, ALERGIAS Y FUNCIÓN RENAL
    if (/\b(contraste|alergia|renal)\b/.test(cleanText)) {
      matchedBlocks.push(
        `💉 **Sobre el radiofármaco del PET, el Contraste y las Alergias**:\n\n` +
        `Es muy importante distinguir entre el **trazador del PET** y el **contraste del TAC**:\n\n` +
        `• **El trazador del PET NO da alergia ni daña el riñón**: Se administra en cantidades traza microscópicas; **no contiene yodo** y es totalmente seguro aunque tengas alergia al yodo, al marisco, a medicamentos o insuficiencia renal.\n` +
        `• **¿Cuándo se usa contraste yodado?**: Solo cuando el médico nuclear pauta específicamente un TAC diagnóstico con contraste. Si tienes **alergia al contraste yodado o problemas de riñón (creatinina alta)**, avísanos al llegar a recepción para realizar tu estudio sin contraste yodado con total seguridad.`
      );
    }

    // 9. FIEBRE, GRIPE, TOS, INFECCIÓN O VACUNAS RECIENTES
    if (/\b(fiebre|infeccion_respiratoria)\b/.test(cleanText)) {
      matchedBlocks.push(
        `🤒 **¿Tienes fiebre, gripe, tos intensa o te has vacunado recientemente?**:\n\n` +
        `${saludoNombre}gracias por avisarnos de esto:\n\n` +
        `• **Fiebre alta o infección aguda (gripe, COVID, bronquitis)**: Los glóbulos blancos activados por una infección o una vacuna reciente consumen mucha glucosa y pueden hacer que se iluminen ganglios reactivos en el PET. Además, durante los 20 minutos de escáner es importante no tener ataques fuertes de tos para no mover la imagen.\n` +
        `• **¿Qué debes hacer?**: No tomes jarabes con azúcar. Si tienes **fiebre (>38 ºC)** o malestar importante, comunícalo a nuestro equipo de enfermería pulsando aquí para que el médico nuclear valore tu caso: [CONFIRMA_UNIDAD].`
      );
    }

    // 10. EMBARAZO PROPIO, LACTANCIA MATERNA Y MENSTRUACIÓN
    if (/\b(lactancia|menstruacion)\b/.test(cleanText) || (cleanText.includes('embaraz') && (cleanText.includes('estoy') || cleanText.includes('puedo estar') || cleanText.includes('duda') || cleanText.includes('test')))) {
      matchedBlocks.push(
        `🤰 **Embarazo, Lactancia Materna y Menstruación**:\n\n` +
        `• **Embarazo o sospecha de embarazo**: Si estás embarazada o crees que podrías estarlo, **es obligatorio comunicarlo antes de inyectar el trazador**.\n` +
        `• **Lactancia materna**: El trazador apenas pasa a la leche materna, pero sí hay radiación por proximidad física con el bebé. Te recomendamos **extraerte leche antes de acudir a la cita** para que otra persona se la dé en biberón durante las **6 a 12 horas posteriores** a la prueba.\n` +
        `• **Menstruación (regla)**: **Puedes hacerte el PET-CT con total normalidad aunque tengas la regla**. No afecta en absoluto a la prueba; simplemente indícaselo a la enfermera al llegar.`
      );
    }

    // 11. SONDA VESICAL, BOLSAS DE OSTOMÍA O INCONTINENCIA
    if (/\b(sonda_ostomia)\b/.test(cleanText)) {
      matchedBlocks.push(
        `🩺 **Pacientes con Sonda Vesical, Bolsa de Ostomía o Pañal**:\n\n` +
        `• **Sonda vesical (bolsa de orina)**: Puedes acudir con tu sonda sin ningún problema. Nuestro equipo de enfermería la registrará al llegar para que los técnicos mantengan la bolsa vaciada antes de pasar al escáner.\n` +
        `• **Colostomía, ileostomía o urostomía**: Ven con tu bolsa puesta con normalidad y **trae contigo un recambio completo** por si fuera necesario cambiarla o vaciarla antes de entrar al tomógrafo.\n` +
        `• **Pañal o compresa de incontinencia**: Como el trazador se elimina por la orina, te pediremos poner un absorbente limpio justo antes de entrar a la máquina para que la imagen de la pelvis salga completamente limpia.`
      );
    }

    // 12. FRÍO EN LA SALA / GRASA PARDA Y DOLOR EN CAMILLA
    if (/\b(frio_sala|dolor_camilla)\b/.test(cleanText)) {
      matchedBlocks.push(
        `🧣 **Temperatura corporal (Grasa Parda) y Comodidad en la Camilla**:\n\n` +
        `• **¡Ven bien abrigado/a! (Importante contra el frío)**: Pasar frío antes o durante la prueba activa un tejido llamado **grasa parda** en el cuello y los hombros que absorbe el trazador. Ven con ropa calentita (sin metales) y en el box de reposo te daremos mantas para que estés muy confortable.\n` +
        `• **Si tienes dolor de espalda o te cuesta aguantar tumbado/a**: Puedes tomar tu **analgésico habitual con agua sola** en casa antes de venir, y al llegar díselo a la enfermera: disponemos de cojines anatómicos para las rodillas y apoyo lumbar.`
      );
    }

    // 13. JUSTIFICANTE MÉDICO DE ASISTENCIA / TRABAJO
    if (/\b(justificante)\b/.test(cleanText)) {
      matchedBlocks.push(
        `📄 **Justificante de asistencia para el trabajo (paciente y acompañante)**:\n\n` +
        `• **Sí, entregamos justificante oficial del SERGAS / Galaria** tanto para ti como para tu acompañante.\n` +
        `• Solo tienes que **pedirlo en el mostrador administrativo de Medicina Nuclear (Planta -1)** al llegar o al finalizar la prueba, y te lo sellaremos con la hora de entrada y salida.`
      );
    }

    // 14. CHICLES Y CARAMELOS
    if (/\b(chicle|caramelo|golosina|pastilla de goma|menta|hall|smint)\b/.test(cleanText)) {
      matchedBlocks.push(
        `🚫 **Chicles y caramelos (incluso sin azúcar)**:\n\n` +
        `**No debes mascar chicle ni chupar caramelos (tampoco sin azúcar)** durante las ${profile.fastingHours} horas previas.\n\n` +
        `El movimiento de masticar ejercita los músculos de la mandíbula y la lengua, haciendo que capten el radiofármaco y oculten estructuras importantes del cuello y la garganta.`
      );
    }

    // 15. RADIOPROTECCIÓN POSTERIOR
    if (/\b(radioproteccion|embarazada|embarazo|nino|hijo|radiofarmaco|aislamiento|bebe|mascota|perro|gato)\b/.test(cleanText) || (isDespues && /\b(contacto|precaucion|familia|vida normal|casa|dormir|bano)\b/.test(cleanText))) {
      matchedBlocks.push(
        `☢️ **Medidas de Radioprotección tras la prueba (6 horas)**:\n\n` +
        `${saludoNombre}tras la prueba eliminarás la pequeña radiación residual rápidamente por la orina. Durante las **6 horas posteriores**:\n\n` +
        `• **Niños pequeños, bebés y mujeres embarazadas**: Mantén unos **2 metros de distancia** y evita cogerlos en brazos durante esas 6 horas.\n` +
        `• **Higiene e hidratación**: Bebe **1 a 1.5 litros de agua**, orina sentado/a, tira de la cadena **2 veces** y lávate bien las manos.\n` +
        `• **Adultos y mascotas**: Con otros adultos y con tus mascotas no hay riesgo; pasadas las 6 horas puedes hacer vida 100% normal.`
      );
    }

    // 16. AYUNO PREVIO (ADAPTADO POR PROTOCOLO Y CON HORA EXACTA CALCULADA)
    if (/\b(ayuno|comer antes|en ayunas)\b/.test(cleanText) || (!isDespues && /\b(desayunar)\b/.test(cleanText)) || (cleanText.includes('horas') && /\b(cuant|antes|falta|debo|tengo|espera|empezar)\b/.test(cleanText))) {
      const pautaHoraStr = horaLimiteAyuno
        ? `\n• 📌 **Cálculo personalizado para tu cita de las ${pH} h**: Debes iniciar el ayuno **como muy tarde a las ${horaLimiteAyuno} h**.`
        : '';
      matchedBlocks.push(
        `⏱️ **El Ayuno estricto de ${profile.fastingHours} horas (${studyTitle})**:\n\n` +
        `${saludoNombre}el ayuno es clave para que la prueba salga perfecta:\n\n` +
        `• Guarda **ayuno estricto de alimentos sólidos durante al menos ${profile.fastingHours} horas antes de tu cita** (${pH} h).${pautaHoraStr}\n` +
        `• **No tomes ningún alimento, ni leche, ni café, ni zumos, ni chicles**.\n` +
        `• **El agua pura sola SÍ está permitida**: Bebe 2 o 3 vasos de agua sola en casa durante el ayuno.`
      );
    }

    // 17. AGUA E HIDRATACIÓN
    if (/\b(agua|sed|hidrat|liquido|trago|beber|bebo)\b/.test(cleanText)) {
      matchedBlocks.push(
        `💧 **Consumo de Agua (antes y después del PET)**:\n\n` +
        `• **Antes de la prueba (durante el ayuno)**: **Sí, puedes y debes beber agua sola pura** (entre medio litro y 1 litro, sin gas ni sabores). Hidrata tus venas para que el pinchazo sea muy fácil y prepara tus riñones.\n` +
        `• **Después de la prueba**: Bebe otros **1 a 1.5 litros de agua** a lo largo de la tarde para expulsar el trazador por la orina rápidamente.`
      );
    }

    // 18. DIETA DEL DÍA ANTERIOR (ADAPTADA SEGÚN SEA ENDOCARDITIS, NON-FDG O FDG GENERAL)
    if (!isDespues && /\b(dieta|dia anterior|vispera|que como|que puedo comer|cenar|carbohidrato|hidrato|pan|pasta|arroz|patata|dulce|fruta|legumbre|azucar|huevos|pescado|carne|ensalada|queso)\b/.test(cleanText)) {
      if (profile.code === 'ENDOCARDITIS') {
        matchedBlocks.push(
          `🥩 **Dieta Especial de Carne y Grasa Exclusiva (24h antes — Endocarditis)**:\n\n` +
          `Para apagar el consumo de glucosa del corazón sano y ver con nitidez las válvulas cardíacas, durante las **24 horas previas (y antes de iniciar las 16h de ayuno)**:\n\n` +
          `• ✔️ **SÍ puedes comer**: Carnes a la plancha/asadas (ternera, cerdo, pollo, pavo), huevos fritos o en tortilla, bacon, jamón serrano, pescados, quesos curados y aceite de oliva.\n` +
          `• ❌ **PROHIBIDO (0% hidratos)**: Nada de pan, pasta, arroz, patatas, legumbres, frutas, verduras, leche, zumos ni azúcares.`
        );
      } else if (profile.isNonFdg) {
        matchedBlocks.push(
          `🍽️ **Alimentación el día anterior (${studyTitle})**:\n\n` +
          `Para este estudio **NO necesitas hacer dieta baja en carbohidratos** el día anterior (ya que el trazador no es glucosa). Puedes comer y cenar con normalidad la víspera y guardar únicamente las **${profile.fastingHours} horas de ayuno** previas con agua sola.`
        );
      } else {
        matchedBlocks.push(
          `🥗 **Dieta del día anterior (24h antes — Baja en carbohidratos)**:\n\n` +
          `Durante las 24 horas previas a tu cita sigue una **dieta pobre en hidratos de carbono y azúcares**:\n\n` +
          `• ✔️ **Sí puedes comer**: Carnes a la plancha o asadas (pollo, pavo, ternera, cerdo), pescados blancos o azules, marisco, huevos (tortilla francesa, huevo cocido), jamón serrano, queso curado y verduras verdes bajas en hidratos (lechuga, espinacas, calabacín) con aceite de oliva y sal.\n` +
          `• ❌ **Debes evitar**: Pan, pasta, arroz, patatas, legumbres, fruta, zumos, leche, galletas, bollería, azúcar, miel y dulces.\n` +
          `• 🌙 **Cena de la víspera**: Cena ligero y temprano (ej. tortilla francesa o pescado a la plancha con calabacín o ensalada verde) y bebe solo agua.`
        );
      }
    }

    // 19. EJERCICIO Y ESFUERZO FÍSICO
    if (/\b(ejercicio|deporte|gimnasio|gym|entrenar|correr|pesas|spinning|bici|andar mucho|caminar mucho|esfuerzo|trabajar fisico)\b/.test(cleanText)) {
      matchedBlocks.push(
        `❌ **Reposo muscular (Sin deporte 24-48 horas antes)**:\n\n` +
        `${saludoNombre}**no realices ejercicio físico, gimnasio, carreras ni esfuerzos musculares intensos en las 24 a 48 horas previas**.\n\n` +
        `El músculo ejercitado capta intensamente el trazador y resta nitidez al estudio. Haz vida tranquila sin esfuerzos físicos.`
      );
    }

    // 20. DIABETES, GLUCEMIA E INSULINA
    if (/\b(diabetes|glucemia|insulina|antidiabetico)\b/.test(cleanText)) {
      if (profile.isDiabetic) {
        matchedBlocks.push(
          `💉 **Control de Diabetes y Glucemia para tu PET FDG**:\n\n` +
          `• **Insulina rápida**: Debes dejar un margen de **4 a 6 horas sin insulina rápida** antes de la inyección del radiofármaco.\n` +
          `• **Mídete el azúcar capilar 1-2 horas antes de salir de casa**:\n` +
          `  - 🟢 **Menos de 160 mg/dL**: Nivel óptimo para hacer el PET.\n` +
          `  - 🟡 **160 a 199 mg/dL**: Acude con normalidad y avísanos al llegar.\n` +
          `  - 🔴 **200 mg/dL o más**: Avísanos de inmediato pulsando aquí para que enfermería te indique cómo proceder: [CONFIRMA_UNIDAD].`
        );
      } else {
        matchedBlocks.push(
          `💉 **¿Tienes Diabetes o tomas medicación para el azúcar?**:\n\n` +
          `Si eres diabético/a o tomas insulina/pastillas para el azúcar (como metformina), tu azúcar en ayunas debe estar **por debajo de 200 mg/dL** (idealmente <160 mg/dL) y no debes pincharte insulina rápida en las 4-6 horas previas.\n\n` +
          `👉 Comunícaselo a nuestro equipo de enfermería pulsando aquí para darte tu pauta horaria personalizada: [CONFIRMA_UNIDAD]`
        );
      }
    }

    // 21. TABACO Y VAPEO
    if (/\b(fumar|tabaco|vapear|nicotina|cigarro|vaper)\b/.test(cleanText)) {
      matchedBlocks.push(
        `🚭 **Tabaco y vapeo antes de la prueba**:\n\n` +
        `Evita **fumar o vapear durante las 12 horas previas y en la mañana de la cita**, ya que la nicotina contrae los vasos sanguíneos y puede activar la captación en vías respiratorias.`
      );
    }

    // 22. ROPA, JOYAS, MARCAPASOS Y PRÓTESIS
    if (/\b(ropa|vestir|metal|joyas|marcapasos|protesis|dentadura|sujetador|piercing|desvestir|audifono|implante)\b/.test(cleanText)) {
      matchedBlocks.push(
        `👕 **Ropa cómoda, objetos metálicos y prótesis**:\n\n` +
        `• **Ropa**: Ven con ropa cómoda, holgada, **abrigada** y a ser posible sin cremalleras ni botones metálicos (ej. chándal y sujetador sin aros).\n` +
        `• **Joyas y accesorios**: Quítate pendientes, cadenas, reloj, monedas y cinturón antes de pasar al escáner.\n` +
        `• **Marcapasos, prótesis de cadera/rodilla o implantes dentales**: **Son 100% seguros en el PET-CT** (no es un imán como la resonancia). Solo avisa al técnico al entrar.`
      );
    }

    // 23. DURACIÓN Y FASES DE LA PRUEBA
    if (/\b(dura|duracion|fases|cuanto tarda|cuanto tiempo|como es la prueba|en que consiste)\b/.test(cleanText)) {
      matchedBlocks.push(
        `⏱️ **Duración total (~2 a 2.5 horas) y fases del estudio**:\n\n` +
        `1. **Recepción y vía** (~15 min): Comprobamos tu preparación y canalizamos una pequeña vía en el brazo.\n` +
        `2. **Inyección del trazador** (~2 min): No duele ni produce calor ni malestar.\n` +
        `3. **Reposo en box individual** (~${profile.uptakeMin} min): Estarás recostado/a en penumbra, abrigado/a y en silencio (sin hablar ni usar el móvil) mientras el trazador se distribuye.\n` +
        `4. **Escáner PET-CT** (~20 min): La camilla avanza suavemente por un aro amplio y abierto.\n` +
        `5. **Confirmación médica y alta** (~15-20 min): El médico nuclear comprueba que las imágenes son óptimas, te retiramos la vía y ya puedes desayunar/comer e irte a casa.`
      );
    }

    // 24. RESULTADOS E INFORME MÉDICO
    if (/\b(resultado|resultados|informe|cuando me dan|quien me da|saber que salio)\b/.test(cleanText)) {
      matchedBlocks.push(
        `📋 **¿Cuándo estarán los resultados del PET-CT?**:\n\n` +
        `Las imágenes tridimensionales requieren reconstrucción e interpretación detallada por el especialista en Medicina Nuclear, por lo que no se entregan en el momento.\n\n` +
        `El informe oficial se envía telemáticamente a **tu médico solicitante** y estará disponible en tu historia electrónica (**É-Saúde**) habitualmente en **48 a 72 horas laborables**.`
      );
    }

    // 25. ACOMPAÑANTES
    if (/\b(acompan|familiar|venir con|ir solo|ir sola)\b/.test(cleanText)) {
      matchedBlocks.push(
        `👥 **Acompañantes**:\n\n` +
        `Puedes venir acompañado/a hasta el servicio (tu acompañante esperará en la sala general mientras estás en el box de reposo, salvo que necesites asistencia directa por movilidad). Recuerda que tu acompañante **no debe ser una mujer embarazada ni un niño menor de edad**.`
      );
    }

    // 26. CLAUSTROFOBIA Y ANSIEDAD
    if (/\b(claustrofobia|miedo|cerrado|tubo|ansiedad|agobio|nervioso|nerviosa)\b/.test(cleanText)) {
      matchedBlocks.push(
        `🧘 **Tranquilidad si tienes claustrofobia o ansiedad**:\n\n` +
        `${saludoNombre}el equipo PET-CT **no es un túnel cerrado**: es un anillo corto, muy ancho (>70 cm) y abierto por ambos extremos, silencioso y ventilado.\n\n` +
        `Estaremos viéndote y escuchándote en todo momento, y si lo necesitas podemos administrarte un suave ansiolítico sublingual al llegar (en ese caso ven con alguien que conduzca a la vuelta).`
      );
    }

    // 27. CANCELAR O CAMBIAR CITA
    if (/\b(cancelar|anular|cambiar cita|aplazar|posponer|no puedo ir)\b/.test(cleanText)) {
      matchedBlocks.push(
        `📅 **Cancelar o cambiar tu cita**:\n\n` +
        `• Pulsa aquí para abrir el aviso directo de cancelación/reprogramación: [ABRIR_CANCELACION]\n` +
        `• O llámanos directamente a la Unidad PET: [CONFIG_TEL].`
      );
    }

    // 28. CONTACTO CON ENFERMERÍA
    if (/\b(otra consulta|otras consultas|otra pregunta|llamar|llamada|telefono|contacto|hablar con enfermera)\b/.test(cleanText)) {
      matchedBlocks.push(
        `📞 **Hablar con una enfermera de Medicina Nuclear**:\n\n` +
        `👉 Pulsa aquí para enviarnos tu consulta escrita o por nota de voz y que te llamemos por teléfono: [CONFIRMA_UNIDAD]\n` +
        `• Teléfono directo de la unidad: [CONFIG_TEL].`
      );
    }

    // SI SE DETECTARON UNA O VARIAS INTENCIONES CLÍNICAS, DEVOLVERLAS COMBINADAS
    if (matchedBlocks.length > 0) {
      if (matchedBlocks.length === 1) {
        return matchedBlocks[0];
      }
      return `👩‍⚕️ **He detectado varias consultas en tu mensaje. Te respondo a cada una paso a paso**:\n\n` +
             matchedBlocks.join('\n\n────────────────────────\n\n');
    }

    // SALUDOS Y AGRADECIMIENTOS
    if (/\b(hola|buenos dias|buenas tardes|buenas noches|saludos|quien eres|ayuda)\b/.test(cleanText)) {
      return `¡Hola! Soy tu enfermero/a virtual de Medicina Nuclear para tu prueba **${studyTitle}**.\n\n` +
             `${saludoNombre}puedo ayudarte en castellano o en galego con cualquier duda sobre tu preparación: **ayuno (${horaLimiteAyuno ? `desde las ${horaLimiteAyuno} h` : `${profile.fastingHours} horas`})**, **dieta previa**, **agua**, **medicación**, **contraste/alergias**, **fiebre/vacunas**, **lactancia**, **aparcamiento** o **radioprotección**.\n\n` +
             `¿Qué te gustaría consultar? (Puedes hacerme una o varias preguntas a la vez).`;
    }

    if (/\b(gracias|muchas gracias|perfecto|entendido|vale|adios|hasta luego)\b/.test(cleanText)) {
      return `¡De nada! Es un placer ayudarte a preparar tu prueba con total tranquilidad. Recuerda beber agua pura durante el ayuno y llegar 15 minutos antes a la Planta -1 del Hospital do Meixoeiro. ¡Te esperamos!`;
    }

    return null;
  }

  function buildHybridAiPayload(rawInput) {
    const profile = detectProtocolProfile();
    let pInf = { hora: '08:20', fecha: '', nombre: '' };
    if (typeof window.getPatientCitationInfo === 'function') {
      pInf = window.getPatientCitationInfo() || pInf;
    } else if (window.PET_CHAT_HUMAN_ENGINE && typeof window.PET_CHAT_HUMAN_ENGINE.getPatientInfo === 'function') {
      const hInf = window.PET_CHAT_HUMAN_ENGINE.getPatientInfo();
      pInf = { hora: hInf.hora || '08:20', fecha: hInf.fecha || '', nombre: hInf.firstName || '' };
    }
    const pH = pInf.hora || '08:20';
    const fastingStart = calcularHoraInicioAyuno(pH, profile.fastingHours) || '';
    const semanticAns = buildSmartBotResponse(rawInput) || '';
    const srvType = profile.serverStudyType || profile.code || 'FDG_ONCOLOGICO';
    let customGuide = '';
    try {
      customGuide = localStorage.getItem(`PET_CUSTOM_GUIDELINE_${srvType}`) || '';
    } catch (e) {}

    return {
      study_type: srvType,
      protocol_title: profile.title,
      fasting_start_hour: fastingStart,
      semantic_context: semanticAns,
      custom_guideline: customGuide
    };
  }

  window.PET_CHATBOT_SEMANTIC_ENGINE = {
    normalizeSemanticText: normalizeSemanticText,
    buildSmartBotResponse: buildSmartBotResponse,
    detectProtocolProfile: detectProtocolProfile,
    calcularHoraInicioAyuno: calcularHoraInicioAyuno,
    buildHybridAiPayload: buildHybridAiPayload
  };
})();
