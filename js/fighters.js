/* ============================================================
   MORDEMANAGER
   Fighter Management
   ============================================================ */


/* ============================================================
   DATA NORMALISATION
   ============================================================ */

function normaliseFighter(
    fighter,
    index
) {

    const typeId =
        fighter.type ||
        fighter.fighterType ||
        fighter.typeId;


    /*
     * At the moment Reikland is the only
     * implemented warband definition.
     */

    const definition =
        state.warbandDefinitions.reikland;


    const fighterType =
        definition?.fighterTypes?.find(
            type =>
                type.id === typeId
        );


    const profile =
        fighter.profile ||
        fighter.stats ||
        fighter.characteristics ||
        fighterType?.profile ||
        {};


    return {

        id:
            fighter.id ||
            generateId("fighter"),


        type:
            typeId ||
            fighterType?.id ||
            "unknown",


        typeName:
            fighter.typeName ||
            fighterType?.name ||
            fighter.name ||
            `Fighter ${index + 1}`,


        category:
            fighter.category ||
            fighterType?.category ||
            "henchman",


        name:
            fighter.name ||
            `${fighterType?.name || "Fighter"} ${index + 1}`,


        profile: {

            M: profile.M ?? "-",

            WS: profile.WS ?? "-",

            BS: profile.BS ?? "-",

            S: profile.S ?? "-",

            T: profile.T ?? "-",

            W: profile.W ?? "-",

            I: profile.I ?? "-",

            A: profile.A ?? "-",

            Ld: profile.Ld ?? "-"

        },


        baseCost:
            fighter.baseCost ??
            fighter.cost ??
            fighterType?.cost ??
            0,


        equipment:
            Array.isArray(
                fighter.equipment
            )
                ? fighter.equipment
                : [],


        skills:
            Array.isArray(
                fighter.skills
            )
                ? fighter.skills
                : [],


        experience:
            Number(
                fighter.experience
            ) || 0,


        injuries:
            Array.isArray(
                fighter.injuries
            )
                ? fighter.injuries
                : [],


        advances:
            Array.isArray(
                fighter.advances
            )
                ? fighter.advances
                : []

    };

}


/* ============================================================
   ADD FIGHTER MODAL
   ============================================================ */

function showAddFighter() {

    const warband = getCurrentWarband();

    if (!warband) {
        return;
    }

    const definition =
        state.warbandDefinitions[warband.type];

    if (!definition) {
        return;
    }

    const fighterTypes =
        definition.fighterTypes || [];

    openModal(`

        <div class="mm-modal mm-modal-large">

            <div class="mm-modal-header">

                <div>

                    <h2>
                        Add Fighter
                    </h2>

                    <p>
                        ${escapeHtml(
                            definition.name || warband.type
                        )}
                    </p>

                </div>

                <button
                    class="mm-modal-close"
                    onclick="closeModal()"
                >
                    ×
                </button>

            </div>

            <div class="mm-modal-body">

                <div class="mm-fighter-type-grid">

                    ${
                        fighterTypes.length

                        ?

                        fighterTypes
                            .map(
                                type =>
                                    renderFighterTypeOption(
                                        type,
                                        warband
                                    )
                            )
                            .join("")

                        :

                        `
                            <p class="mm-muted">
                                No fighter types are currently
                                available for this warband.
                            </p>
                        `
                    }

                </div>

            </div>

        </div>

    `);
}


/* ============================================================
   FIGHTER TYPE OPTION
   ============================================================ */

function renderFighterTypeOption(type, warband) {

    const currentCount =
        (warband.fighters || []).filter(
            fighter =>
                fighter.type === type.id
        ).length;


    const atMaximum =
        type.max !== null &&
        type.max !== undefined &&
        currentCount >= Number(type.max);


    const maximumWarbandSize =
        Number(
            state.warbandDefinitions[
                warband.type
            ]?.maximumWarbandSize
        ) || 999;


    const warbandFull =
        (warband.fighters || []).length >=
        maximumWarbandSize;


    const disabled =
        atMaximum ||
        warbandFull;


    return `

        <button
            type="button"
            class="
                mm-fighter-type-option
                ${disabled ? "is-disabled" : ""}
            "
            ${disabled ? "disabled" : ""}
            onclick="addFighter('${escapeAttribute(type.id)}')"
        >

            <div>

                <span class="mm-badge">
                    ${escapeHtml(
                        type.category || ""
                    )}
                </span>

                <h3>
                    ${escapeHtml(
                        type.name || "Unknown Fighter"
                    )}
                </h3>

            </div>


            <div class="mm-fighter-type-details">

                <span>
                    ${Number(type.cost) || 0} gc
                </span>

                <span>

                    ${currentCount}

                    /

                    ${
                        type.max === null ||
                        type.max === undefined
                            ? "∞"
                            : type.max
                    }

                </span>

            </div>

        </button>

    `;

}


/* ============================================================
   ADD FIGHTER
   ============================================================ */

function addFighter(typeId) {

    const currentWarband =
        getCurrentWarband();


    if (!currentWarband) {

        console.error(
            "No current warband."
        );

        return;

    }


    const definition =
        state.warbandDefinitions[
            currentWarband.type
        ];


    if (!definition) {

        console.error(
            "No warband definition for:",
            currentWarband.type
        );

        return;

    }


    const fighterType =
        (definition.fighterTypes || [])
            .find(
                type =>
                    type.id === typeId
            );


    if (!fighterType) {

        console.error(
            "Fighter type not found:",
            typeId
        );

        alert(
            `Fighter type "${typeId}" not found.`
        );

        return;

    }


    /* --------------------------------------------------------
       CHECK TYPE LIMIT
       -------------------------------------------------------- */

    const existing =
        (currentWarband.fighters || [])
            .filter(
                fighter =>
                    fighter.type === fighterType.id
            )
            .length;


    if (
        fighterType.max !== null &&
        fighterType.max !== undefined &&
        existing >= Number(fighterType.max)
    ) {

        alert(
            `You cannot have more than ${fighterType.max} ${fighterType.name}(s).`
        );

        return;

    }


    /* --------------------------------------------------------
       CHECK TOTAL WARBAND SIZE
       -------------------------------------------------------- */

    const maximumSize =
        Number(
            definition.maximumWarbandSize
        ) || 999;


    if (
        currentWarband.fighters.length >=
        maximumSize
    ) {

        alert(
            `This warband cannot contain more than ${maximumSize} fighters.`
        );

        return;

    }


    /* --------------------------------------------------------
       CREATE FIGHTER
       -------------------------------------------------------- */

    const fighter = {

        id:
            generateId("fighter"),

        type:
            fighterType.id,

        typeName:
            fighterType.name,

        category:
            fighterType.category || "henchman",

        name:
            generateDefaultFighterName(
                fighterType,
                currentWarband
            ),

        profile: {
            ...(fighterType.profile || {})
        },

        baseCost:
            Number(fighterType.cost) || 0,

        equipment: [],

        skills: [],

        experience:
            Number(
                fighterType.startingExperience
            ) || 0,

        advances: [],

        injuries: []

    };


    currentWarband.fighters.push(
        fighter
    );


    savePlayerData();


    closeModal();

    renderApplication();


    /* --------------------------------------------------------
       OPEN EDITOR
       -------------------------------------------------------- */

    setTimeout(
        () => {
            showEditFighter(
                fighter.id
            );
        },
        50
    );

}


/* ============================================================
   RENDER FIGHTERS
   ============================================================ */

function renderFighters(warband) {

    if (!warband.fighters.length) {

        return `

            <div class="mm-empty-state mm-empty-small">

                <div class="mm-empty-icon">
                    ⚔
                </div>

                <h3>
                    No fighters
                </h3>

                <p>
                    Add your Captain to begin
                    building your warband.
                </p>

            </div>

        `;

    }


    const heroes =
        warband.fighters.filter(
            fighter =>
                fighter.category ===
                "hero"
        );


    const henchmen =
        warband.fighters.filter(
            fighter =>
                fighter.category ===
                "henchman"
        );


    return `

        ${
            heroes.length
                ? `

                    <div class="mm-fighter-group">

                        <h3>
                            Heroes
                        </h3>

                        <div class="mm-fighter-list">

                            ${heroes
                                .map(
                                    renderFighter
                                )
                                .join("")}

                        </div>

                    </div>

                `
                : ""
        }


        ${
            henchmen.length
                ? `

                    <div class="mm-fighter-group">

                        <h3>
                            Henchmen
                        </h3>

                        <div class="mm-fighter-list">

                            ${henchmen
                                .map(
                                    renderFighter
                                )
                                .join("")}

                        </div>

                    </div>

                `
                : ""
        }

    `;

}


/* ============================================================
   RENDER SINGLE FIGHTER
   ============================================================ */

function renderFighter(fighter) {

    const profile =
        fighter.profile || {};


    const equipment =
        Array.isArray(
            fighter.equipment
        )
            ? fighter.equipment
            : [];


    return `

        <article class="mm-fighter-card">

            <div class="mm-fighter-main">

                <div class="mm-fighter-name">

                    <span class="mm-badge">
                        ${escapeHtml(
                            fighter.category
                        )}
                    </span>


                    <button
                        type="button"
                        class="mm-fighter-name-button"
                        onclick="showFighterDetails('${escapeAttribute(fighter.id)}')"
                    >
                        <h3>
                            ${escapeHtml(fighter.name)}
                        </h3>
                    </button>


                    <span class="mm-fighter-type">
                        ${escapeHtml(
                            fighter.typeName
                        )}
                    </span>

                </div>


                <div class="mm-profile">

                    ${renderStat(
                        "M",
                        profile.M
                    )}

                    ${renderStat(
                        "WS",
                        profile.WS
                    )}

                    ${renderStat(
                        "BS",
                        profile.BS
                    )}

                    ${renderStat(
                        "S",
                        profile.S
                    )}

                    ${renderStat(
                        "T",
                        profile.T
                    )}

                    ${renderStat(
                        "W",
                        profile.W
                    )}

                    ${renderStat(
                        "I",
                        profile.I
                    )}

                    ${renderStat(
                        "A",
                        profile.A
                    )}

                    ${renderStat(
                        "Ld",
                        profile.Ld
                    )}

                </div>

            </div>


            <div class="mm-fighter-equipment">

                <strong>
                    Equipment
                </strong>


                <div class="mm-equipment-tags">

                    ${
                        equipment.length

                            ? equipment
                                .map(
                                    renderEquipmentTag
                                )
                                .join("")

                            : `

                                <span class="mm-muted">
                                    None
                                </span>

                            `
                    }

                </div>

            </div>


            <div class="mm-fighter-footer">

                <span>

                    ${calculateFighterCost(
                        fighter
                    )} gc

                </span>


                <div>

                    <button
                        class="mm-button mm-button-small"
                        onclick="showEditFighter('${escapeAttribute(fighter.id)}')"
                    >
                        Edit
                    </button>


                    <button
                        class="
                            mm-button
                            mm-button-small
                            mm-button-danger
                        "
                        onclick="deleteFighter('${escapeAttribute(fighter.id)}')"
                    >
                        Remove
                    </button>

                </div>

            </div>

        </article>

    `;

}


/* ============================================================
   PROFILE STAT
   ============================================================ */

function renderStat(
    name,
    value
) {

    return `

        <div class="mm-stat">

            <span>
                ${escapeHtml(name)}
            </span>

            <strong>
                ${escapeHtml(value)}
            </strong>

        </div>

    `;

}


/* ============================================================
   EDIT FIGHTER
   ============================================================ */

function showEditFighter(
    fighterId
) {

    const warband =
        getCurrentWarband();


    const fighter =
        warband?.fighters.find(
            item =>
                item.id ===
                fighterId
        );


    if (!fighter) {

        return;

    }


    const definition =
        state.warbandDefinitions[
            warband.type
        ];


    const fighterType =
        definition?.fighterTypes?.find(
            type =>
                type.id ===
                fighter.type
        );


    if (!fighterType) {

        return;

    }


    const availableEquipment =
        getAvailableEquipment(
            fighterType
        );


    openModal(`

        <div class="mm-modal mm-modal-large">

            <div class="mm-modal-header">

                <div>

                    <span class="mm-badge">
                        ${escapeHtml(
                            fighter.category
                        )}
                    </span>


                    <h2>
                        ${escapeHtml(
                            fighter.name
                        )}
                    </h2>

                </div>


                <button
                    class="mm-modal-close"
                    onclick="closeModal()"
                >
                    ×
                </button>

            </div>


            <div class="mm-modal-body">


                <label class="mm-field">

                    <span>
                        Name
                    </span>


                    <input
                        id="edit-fighter-name"
                        type="text"
                        value="${escapeAttribute(
                            fighter.name
                        )}"
                    >

                </label>


                <section class="mm-editor-section">

                    <h3>
                        Profile
                    </h3>


                    <p class="mm-muted">

                        Starting characteristics are
                        defined by the warband rules.
                        Advances and injuries will modify
                        these values through the campaign
                        system.

                    </p>


                    <div class="mm-profile-editor">

                        ${Object.entries(
                            fighter.profile
                        )
                            .map(
                                ([stat, value]) =>
                                    renderReadOnlyStat(
                                        stat,
                                        value
                                    )
                            )
                            .join("")}

                    </div>

                </section>


                <section class="mm-editor-section">

                    <div class="mm-section-header">

                        <div>

                            <h3>
                                Equipment
                            </h3>

                            <p>
                                Select equipment
                                available to this fighter.
                            </p>

                        </div>

                    </div>


                    <div id="fighter-equipment-validation"></div>


                    <div class="mm-equipment-selection">

                        ${availableEquipment
                            .map(
                                item =>
                                    renderEquipmentCheckbox(
                                        fighter,
                                        item
                                    )
                            )
                            .join("")}

                    </div>

                </section>


                <section class="mm-editor-section">

                    <h3>
                        Experience
                    </h3>


                    <label class="mm-field">

                        <span>
                            Experience
                        </span>


                        <input
                            id="edit-fighter-xp"
                            type="number"
                            min="0"
                            value="${fighter.experience || 0}"
                        >

                    </label>

                </section>


                <section class="mm-editor-section">

                    <h3>
                        Current Equipment Value
                    </h3>


                    <p>

                        ${calculateFighterCost(
                            fighter
                        )} gc

                    </p>

                </section>


            </div>


            <div class="mm-modal-footer">

                <button
                    class="mm-button"
                    onclick="closeModal()"
                >
                    Cancel
                </button>


                <button
                    class="mm-button mm-button-primary"
                    onclick="saveFighterChanges('${escapeAttribute(fighter.id)}')"
                >
                    Save Fighter
                </button>

            </div>

        </div>

    `);


    setupFighterEquipmentValidation(
        fighter,
        definition
    );

}


/* ============================================================
   LIVE EQUIPMENT VALIDATION
   ============================================================ */

function setupFighterEquipmentValidation(
    fighter,
    definition
) {

    const checkboxes =
        document.querySelectorAll(
            ".mm-equipment-selection input[type='checkbox']"
        );


    const validationContainer =
        document.getElementById(
            "fighter-equipment-validation"
        );


    if (
        !checkboxes.length ||
        !validationContainer
    ) {

        return;

    }


    function validateSelection() {

        const selectedEquipment =
            Array.from(
                checkboxes
            )
                .filter(
                    checkbox =>
                        checkbox.checked
                )
                .map(
                    checkbox =>
                        checkbox.value
                );


        const warband =
            getCurrentWarband();


        if (!warband) {

            return;

        }


        const validation =
            RulesEngine.validateEquipmentChange(
                warband,
                fighter,
                selectedEquipment,
                definition,
                state.equipment
            );


        validationContainer.innerHTML =
            renderEquipmentValidation(
                validation
            );


        /*
         * Disable Save while the equipment
         * selection is invalid.
         */

        const saveButton =
            document.querySelector(
                ".mm-modal-footer .mm-button-primary"
            );


        if (saveButton) {

            saveButton.disabled =
                !validation.valid;

        }

    }


    checkboxes.forEach(
        checkbox => {

            checkbox.addEventListener(
                "change",
                validateSelection
            );

        }
    );


    /*
     * Validate the initial selection too.
     */

    validateSelection();

}


/* ============================================================
   PROFILE STAT (READ ONLY)
   ============================================================ */

function renderReadOnlyStat(
    stat,
    value
) {

    return `

        <div class="mm-stat-editor">

            <span>
                ${escapeHtml(
                    stat
                )}
            </span>


            <strong>
                ${escapeHtml(
                    value
                )}
            </strong>

        </div>

    `;

}


/* ============================================================
   EQUIPMENT CHECKBOX
   ============================================================ */

function renderEquipmentCheckbox(
    fighter,
    item
) {

    const selected =
        fighter.equipment.includes(
            item.id
        );


    const traits =
        Array.isArray(
            item.traits
        )
            ? item.traits
            : [];


    return `

        <label
            class="mm-equipment-option"
        >

            <input
                type="checkbox"
                value="${escapeAttribute(
                    item.id
                )}"
                ${selected
                    ? "checked"
                    : ""}
            >


            <span>

                <strong>
                    ${escapeHtml(
                        item.name
                    )}
                </strong>


                <small>
                    ${item.cost ?? 0} gc
                </small>

            </span>


            ${
                traits.length

                    ? `

                        <span class="mm-equipment-traits">

                            ${traits
                                .map(
                                    traitId => {

                                        const trait =
                                            getTrait(
                                                traitId
                                            );


                                        return `

                                            <span
                                                class="mm-mini-trait"
                                            >
                                                ${escapeHtml(
                                                    trait?.name ||
                                                    traitId
                                                )}
                                            </span>

                                        `;

                                    }
                                )
                                .join("")}

                        </span>

                    `
                    : ""
            }

        </label>

    `;

}


/* ============================================================
   SAVE FIGHTER
   ============================================================ */

function saveFighterChanges(
    fighterId
) {

    const warband =
        getCurrentWarband();


    if (!warband) {

        return;

    }


    const fighter =
        warband.fighters.find(
            item =>
                item.id === fighterId
        );


    if (!fighter) {

        return;

    }


    const definition =
        state.warbandDefinitions[
            warband.type
        ];


    if (!definition) {

        alert(
            "The warband rules could not be found."
        );

        return;

    }


    const nameInput =
        document.getElementById(
            "edit-fighter-name"
        );


    const xpInput =
        document.getElementById(
            "edit-fighter-xp"
        );


    if (
        nameInput &&
        nameInput.value.trim()
    ) {

        fighter.name =
            nameInput.value.trim();

    }


    if (xpInput) {

        fighter.experience =
            Math.max(
                0,
                Number(
                    xpInput.value
                ) || 0
            );

    }


    /*
     * Collect the equipment selected
     * in the editor.
     */

    const checkboxes =
        document.querySelectorAll(
            ".mm-equipment-selection input[type='checkbox']"
        );


    const newEquipment =
        Array.from(
            checkboxes
        )
            .filter(
                checkbox =>
                    checkbox.checked
            )
            .map(
                checkbox =>
                    checkbox.value
            );


    /*
     * Validate the proposed equipment
     * change BEFORE modifying the fighter.
     */

    if (
        typeof RulesEngine === "undefined" ||
        typeof RulesEngine.validateEquipmentChange !==
            "function"
    ) {

        alert(
            "The rules engine is not available."
        );

        return;

    }


    const validation =
        RulesEngine.validateEquipmentChange(
            warband,
            fighter,
            newEquipment,
            definition,
            state.equipment
        );


    /*
     * Block invalid equipment selections.
     */

    if (!validation.valid) {

        const messages =
            validation.errors
                .map(
                    error =>
                        `• ${error.message}`
                )
                .join("\n");


        alert(
            "Fighter cannot be saved:\n\n" +
            messages
        );


        return;

    }


    /*
     * Apply the validated equipment change.
     *
     * This updates both the fighter's
     * equipment and the warband treasury.
     */

    try {

        RulesEngine.applyEquipmentChange(
            warband,
            fighter,
            newEquipment,
            definition,
            state.equipment
        );

    } catch (error) {

        console.error(
            "Equipment change failed:",
            error
        );


        alert(
            error.message ||
            "The equipment change could not be applied."
        );


        return;

    }


    /*
     * Persist only after ALL validation
     * and rule changes have succeeded.
     */

    savePlayerData();


    closeModal();


    renderApplication();

}


/* ============================================================
   EQUIPMENT VALIDATION FEEDBACK
   ============================================================ */

function renderEquipmentValidation(
    validation
) {

    if (!validation) {

        return "";

    }


    if (validation.valid) {

        return `

            <div class="mm-validation mm-validation-success">

                <strong>
                    ✓ Equipment selection is valid
                </strong>

            </div>

        `;

    }


    return `

        <div class="mm-validation mm-validation-error">

            <strong>
                ⚠ Equipment selection is invalid
            </strong>


            <ul>

                ${validation.errors
                    .map(
                        error => `

                            <li>
                                ${escapeHtml(
                                    error.message
                                )}
                            </li>

                        `
                    )
                    .join("")}

            </ul>

        </div>

    `;

}


/* ============================================================
   EQUIPMENT AVAILABILITY
   ============================================================ */

function getAvailableEquipment(
    fighterType
) {

    const listName =
        fighterType?.equipmentList;


    if (!listName) {

        return [];

    }


    /*
     * Equipment lists belong to the
     * warband definition.
     */

    const definition =
        state.warbandDefinitions.reikland;


    const equipmentList =
        definition
            ?.equipmentLists
            ?.[
                listName
            ];


    if (!equipmentList) {

        return [];

    }


    const ids = [

        ...(equipmentList.closeCombat || []),

        ...(equipmentList.missile || []),

        ...(equipmentList.armour || []),

        ...(equipmentList.miscellaneous || []),

        ...(equipmentList.misc || []),

        ...(equipmentList.special || [])

    ];


    /*
     * Remove duplicates.
     */

    const uniqueIds =
        [...new Set(ids)];


    return uniqueIds

        .map(
            getEquipment
        )

        .filter(
            Boolean
        );

}


/* ============================================================
   DELETE FIGHTER
   ============================================================ */

/*
 * Holds the fighter/index removed by performDeleteFighter
 * while the rule-violation warning modal (if any) is open,
 * so cancelFighterRemoval can put them back.
 */

let pendingFighterRemoval = null;


function deleteFighter(
    fighterId
) {

    const warband =
        getCurrentWarband();


    if (!warband) {

        return;

    }


    const fighter =
        warband.fighters.find(
            item =>
                item.id ===
                fighterId
        );


    if (!fighter) {

        return;

    }


    openModal(`

        <div class="mm-modal">

            <div class="mm-modal-header">

                <h2>
                    Remove Fighter
                </h2>

                <button
                    class="mm-modal-close"
                    onclick="closeModal()"
                >
                    ×
                </button>

            </div>


            <div class="mm-modal-body">

                <p>
                    Remove
                    ${escapeHtml(fighter.name)}
                    from the warband? This
                    cannot be undone.
                </p>

            </div>


            <div class="mm-modal-footer">

                <button
                    class="mm-button"
                    onclick="closeModal()"
                >
                    Cancel
                </button>


                <button
                    class="mm-button mm-button-danger"
                    onclick="performDeleteFighter('${escapeAttribute(fighter.id)}')"
                >
                    Remove
                </button>

            </div>

        </div>

    `);

}


function performDeleteFighter(
    fighterId
) {

    const warband =
        getCurrentWarband();


    if (!warband) {

        return;

    }


    const index =
        warband.fighters.findIndex(
            item =>
                item.id === fighterId
        );


    if (index === -1) {

        return;

    }


    const fighter =
        warband.fighters[index];


    /*
     * Refund the fighter's base cost and
     * remove them from the roster.
     *
     * Equipment carried by the fighter is
     * not currently resold (matches prior
     * behaviour - selling equipment back
     * will be handled by the campaign
     * rules later).
     */

    warband.treasury +=
        Number(fighter.baseCost) || 0;


    warband.fighters.splice(
        index,
        1
    );


    const validation =
        validateCurrentWarband(
            warband
        );


    if (validation.errors.length) {

        pendingFighterRemoval = {
            fighter,
            index
        };


        renderFighterRemovalWarning(
            fighter,
            validation
        );

        return;

    }


    savePlayerData();


    closeModal();


    renderApplication();

}


function renderFighterRemovalWarning(
    fighter,
    validation
) {

    openModal(`

        <div class="mm-modal">

            <div class="mm-modal-header">

                <h2>
                    Rule Violations
                </h2>

                <button
                    class="mm-modal-close"
                    onclick="cancelFighterRemoval()"
                >
                    ×
                </button>

            </div>


            <div class="mm-modal-body">

                <p>
                    Removing
                    ${escapeHtml(fighter.name)}
                    creates rule violations:
                </p>


                <ul>

                    ${validation.errors
                        .map(
                            error =>
                                `<li>
                                    ${escapeHtml(error.message)}
                                </li>`
                        )
                        .join("")}

                </ul>


                <p>
                    Save anyway?
                </p>

            </div>


            <div class="mm-modal-footer">

                <button
                    class="mm-button"
                    onclick="cancelFighterRemoval()"
                >
                    Cancel
                </button>


                <button
                    class="mm-button mm-button-danger"
                    onclick="confirmFighterRemoval()"
                >
                    Save Anyway
                </button>

            </div>

        </div>

    `);

}


function cancelFighterRemoval() {

    const warband =
        getCurrentWarband();


    if (warband && pendingFighterRemoval) {

        warband.treasury -=
            Number(
                pendingFighterRemoval.fighter.baseCost
            ) || 0;

        warband.fighters.splice(
            pendingFighterRemoval.index,
            0,
            pendingFighterRemoval.fighter
        );

    }


    pendingFighterRemoval = null;


    closeModal();

}


function confirmFighterRemoval() {

    pendingFighterRemoval = null;


    savePlayerData();


    closeModal();


    renderApplication();

}
