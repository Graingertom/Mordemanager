/* ============================================================
   MORDEMANAGER
   Fighter Management
   ============================================================ */


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

/* ============================================================
   FIGHTER TYPE OPTION
   ============================================================ */

/* ============================================================
   FIGHTER TYPE OPTION
   ============================================================ */

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


    /*
     * Make absolutely sure we are passing
     * the fighter type ID.
     */

    const fighterTypeId =
        String(type.id);


    console.log(
        "Creating fighter button:",
        type.name,
        "->",
        fighterTypeId
    );


    return `

        <button
            type="button"
            class="
                mm-fighter-type-option
                ${disabled ? "is-disabled" : ""}
            "
            ${disabled ? "disabled" : ""}
            onclick="window.MordeManager.addFighter('${escapeAttribute(type.id)}')"
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

/* ============================================================
   ADD FIGHTER
   ============================================================ */

/* ============================================================
   ADD FIGHTER
   ============================================================ */

/* ============================================================
   ADD FIGHTER
   ============================================================ */

function addFighter(typeId) {

    console.log(
        "========== ADD FIGHTER =========="
    );

    console.log(
        "Received fighter type ID:",
        typeId
    );

    console.log(
        "Received type:",
        typeof typeId
    );


    /* --------------------------------------------------------
       CURRENT WARBAND
       -------------------------------------------------------- */

    const currentWarband =
        getCurrentWarband();


    if (!currentWarband) {

        console.error(
            "No current warband."
        );

        return;

    }


    console.log(
        "Current warband:",
        currentWarband
    );


    /* --------------------------------------------------------
       WARBAND DEFINITION
       -------------------------------------------------------- */

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


    console.log(
        "Warband type:",
        currentWarband.type
    );


    console.log(
        "Fighter type IDs:",
        (definition.fighterTypes || [])
            .map(type => type.id)
    );


    /* --------------------------------------------------------
       FIND FIGHTER TYPE
       -------------------------------------------------------- */

    const fighterType =
        (definition.fighterTypes || [])
            .find(
                type =>
                    type.id === typeId
            );


    console.log(
        "Looking for ID:",
        typeId
    );


    console.log(
        "Matched fighter type:",
        fighterType
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

        injuries: [],

        alive: true,

        notes: "",

        status: "active"

    };


    /* --------------------------------------------------------
       ADD TO WARBAND
       -------------------------------------------------------- */

    currentWarband.fighters.push(
        fighter
    );


    console.log(
        "Fighter added:",
        fighter
    );


    /* --------------------------------------------------------
       SAVE
       -------------------------------------------------------- */

    if (
        typeof savePlayerData === "function"
    ) {

        savePlayerData();

    }


    /* --------------------------------------------------------
       CLOSE MODAL / REFRESH
       -------------------------------------------------------- */

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

    const fighters =
        Array.isArray(warband?.fighters)
            ? warband.fighters
            : [];

    if (!fighters.length) {

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
        fighters.filter(
            fighter =>
                fighter.category === "hero"
        );

    const henchmen =
        fighters.filter(
            fighter =>
                fighter.category === "henchman"
        );

    /*
     * Anything that doesn't fit the two standard
     * categories is still displayed rather than lost.
     */

    const other =
        fighters.filter(
            fighter =>
                fighter.category !== "hero" &&
                fighter.category !== "henchman"
        );


    return `

        ${
            heroes.length

            ?

            `

                <div class="mm-fighter-group">

                    <h3>
                        Heroes
                    </h3>

                    <div class="mm-fighter-list">

                        ${heroes
                            .map(renderFighter)
                            .join("")}

                    </div>

                </div>

            `

            :

            ""
        }


        ${
            henchmen.length

            ?

            `

                <div class="mm-fighter-group">

                    <h3>
                        Henchmen
                    </h3>

                    <div class="mm-fighter-list">

                        ${henchmen
                            .map(renderFighter)
                            .join("")}

                    </div>

                </div>

            `

            :

            ""
        }


        ${
            other.length

            ?

            `

                <div class="mm-fighter-group">

                    <h3>
                        Other Fighters
                    </h3>

                    <div class="mm-fighter-list">

                        ${other
                            .map(renderFighter)
                            .join("")}

                    </div>

                </div>

            `

            :

            ""
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
        Array.isArray(fighter.equipment)
            ? fighter.equipment
            : [];

    const status =
        fighter.status ||
        "active";


    return `

        <article
            class="
                mm-fighter-card
                ${
                    status !== "active"
                        ? "is-" +
                          escapeAttribute(status)
                        : ""
                }
            "
        >

            <div class="mm-fighter-main">

                <div class="mm-fighter-name">

                    <span class="mm-badge">

                        ${escapeHtml(
                            fighter.category ||
                            "fighter"
                        )}

                    </span>

                    <h3>
                        ${escapeHtml(
                            fighter.name ||
                            "Unnamed Fighter"
                        )}
                    </h3>

                    <span class="mm-fighter-type">

                        ${escapeHtml(
                            fighter.typeName ||
                            fighter.type ||
                            ""
                        )}

                    </span>

                    ${
                        status !== "active"

                        ?

                        `
                            <span class="mm-fighter-status">

                                ${escapeHtml(
                                    status
                                )}

                            </span>
                        `

                        :

                        ""
                    }

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

                        ?

                        equipment
                            .map(
                                item =>
                                    renderEquipmentTag(
                                        item
                                    )
                            )
                            .join("")

                        :

                        `
                            <span class="mm-muted">
                                None
                            </span>
                        `
                    }

                </div>

            </div>

            <div class="mm-fighter-skills">

    <strong>
        Skills
    </strong>

    <div class="mm-skill-tags">

        ${
            Array.isArray(fighter.skills) &&
            fighter.skills.length

            ?

            renderSkills(
                fighter.skills
            )

            :

            `
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
                    )}

                    gc

                    <small>
                        · ${
                            Number(
                                fighter.experience
                            ) || 0
                        } XP
                    </small>

                </span>


                <div>

                    <button
                        type="button"
                        class="
                            mm-button
                            mm-button-small
                        "
                        onclick="
                            showEditFighter(
                                '${escapeAttribute(
                                    fighter.id
                                )}'
                            )
                        "
                    >
                        Edit
                    </button>


                    <button
                        type="button"
                        class="
                            mm-button
                            mm-button-small
                            mm-button-danger
                        "
                        onclick="
                            deleteFighter(
                                '${escapeAttribute(
                                    fighter.id
                                )}'
                            )
                        "
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
                ${value ?? "-"}
            </strong>

        </div>

    `;
}


/* ============================================================
   EDIT FIGHTER
   ============================================================ */

function showEditFighter(fighterId) {

    const warband =
        getCurrentWarband();

    const fighter =
        warband?.fighters?.find(
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

    const fighterType =
        definition?.fighterTypes?.find(
            type =>
                type.id === fighter.type
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
                            fighter.category ||
                            "fighter"
                        )}

                    </span>

                    <h2>
                        ${escapeHtml(
                            fighter.name
                        )}
                    </h2>

                    <p>
                        ${escapeHtml(
                            fighter.typeName ||
                            fighter.type
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

                    <div class="mm-profile-editor">

                        ${Object.entries(
                            fighter.profile || {}
                        )
                            .map(
                                ([stat, value]) =>
                                    renderEditableStat(
                                        fighter.id,
                                        stat,
                                        value
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
                            value="${
                                Number(
                                    fighter.experience
                                ) || 0
                            }"
                        >

                    </label>

                </section>


                <section class="mm-editor-section">

                    <h3>
                        Equipment
                    </h3>

                    <div class="mm-equipment-selection">

                        ${
                            availableEquipment.length

                            ?

                            availableEquipment
                                .map(
                                    item =>
                                        renderEquipmentCheckbox(
                                            fighter,
                                            item
                                        )
                                )
                                .join("")

                            :

                            `
                                <p class="mm-muted">
                                    No equipment available.
                                </p>
                            `
                        }

                    </div>

                </section>


                <section class="mm-editor-section">

                    <h3>
                        Notes
                    </h3>

                    <textarea
                        id="edit-fighter-notes"
                        class="mm-textarea"
                        rows="4"
                    >${escapeHtml(
                        fighter.notes || ""
                    )}</textarea>

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
                    class="
                        mm-button
                        mm-button-primary
                    "
                    onclick="
                        saveFighterChanges(
                            '${escapeAttribute(
                                fighter.id
                            )}'
                        )
                    "
                >
                    Save Fighter
                </button>

            </div>

        </div>

    `);
}


/* ============================================================
   EDITABLE STAT
   ============================================================ */

function renderEditableStat(
    fighterId,
    stat,
    value
) {

    return `

        <label class="mm-stat-editor">

            <span>
                ${escapeHtml(stat)}
            </span>

            <input
                id="stat-${escapeAttribute(
                    fighterId
                )}-${escapeAttribute(
                    stat
                )}"
                type="text"
                value="${escapeAttribute(
                    value
                )}"
            >

        </label>

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
        Array.isArray(fighter.equipment) &&
        fighter.equipment.includes(
            item.id
        );

    const traits =
        Array.isArray(item.traits)
            ? item.traits
            : [];


    return `

        <label class="mm-equipment-option">

            <input
                type="checkbox"
                value="${escapeAttribute(
                    item.id
                )}"
                ${selected ? "checked" : ""}
            >


            <span>

                <strong>
                    ${escapeHtml(
                        item.name
                    )}
                </strong>

                <small>
                    ${Number(item.cost) || 0} gc
                </small>

            </span>


            ${
                traits.length

                ?

                `
                    <span class="mm-equipment-traits">

                        ${traits
                            .map(
                                traitId => {

                                    const trait =
                                        state.equipment
                                            ?.traits?.[
                                                traitId
                                            ];

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

                :

                ""
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


    /* --------------------------------------------------------
       BASIC DETAILS
       -------------------------------------------------------- */

    const nameInput =
        document.getElementById(
            "edit-fighter-name"
        );

    const xpInput =
        document.getElementById(
            "edit-fighter-xp"
        );

    const notesInput =
        document.getElementById(
            "edit-fighter-notes"
        );


    if (
        nameInput &&
        nameInput.value.trim()
    ) {

        fighter.name =
            nameInput.value.trim();

    }


    fighter.experience =
        Math.max(
            0,
            Number(
                xpInput?.value
            ) || 0
        );


    if (notesInput) {

        fighter.notes =
            notesInput.value;

    }


    /* --------------------------------------------------------
       PROFILE
       -------------------------------------------------------- */

    Object.keys(
        fighter.profile || {}
    ).forEach(
        stat => {

            const input =
                document.getElementById(
                    `stat-${fighter.id}-${stat}`
                );

            if (!input) {
                return;
            }

            const numericValue =
                Number(input.value);

            if (
                !Number.isNaN(
                    numericValue
                )
            ) {

                fighter.profile[stat] =
                    numericValue;

            }

        }
    );


    /* --------------------------------------------------------
       EQUIPMENT
       -------------------------------------------------------- */

    const checkboxes =
        document.querySelectorAll(
            ".mm-equipment-selection input[type='checkbox']"
        );


    fighter.equipment =
        Array.from(checkboxes)
            .filter(
                checkbox =>
                    checkbox.checked
            )
            .map(
                checkbox =>
                    checkbox.value
            );


    /* --------------------------------------------------------
       SAVE
       -------------------------------------------------------- */

    if (
        typeof savePlayerData ===
        "function"
    ) {

        savePlayerData();

    }


    closeModal();


    if (
        typeof renderApplication ===
        "function"
    ) {

        renderApplication();

    }

}


/* ============================================================
   EQUIPMENT AVAILABILITY
   ============================================================ */

function getAvailableEquipment(
    fighterType
) {

    if (!fighterType) {
        return [];
    }

    const listName =
        fighterType.equipmentList;

    const currentWarband =
        getCurrentWarband();

    const warbandType =
        currentWarband?.type ||
        "reikland";

    const definition =
        state.warbandDefinitions[
            warbandType
        ];

    const equipmentList =
        definition
            ?.equipmentLists
            ?.[listName];

    if (!equipmentList) {
        return [];
    }


    const ids = [

        ...(equipmentList.closeCombat || []),

        ...(equipmentList.missile || []),

        ...(equipmentList.armour || []),

        ...(equipmentList.miscellaneous || [])

    ];


    return [
        ...new Set(ids)
    ]
        .map(
            id =>
                typeof getEquipment ===
                "function"
                    ? getEquipment(id)
                    : null
        )
        .filter(Boolean);

}


/* ============================================================
   DELETE FIGHTER
   ============================================================ */

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
                item.id === fighterId
        );

    if (!fighter) {
        return;
    }


    const confirmed =
        confirm(
            `Remove ${fighter.name} from the warband?`
        );

    if (!confirmed) {
        return;
    }


    warband.fighters =
        warband.fighters.filter(
            item =>
                item.id !== fighterId
        );


    if (
        typeof savePlayerData ===
        "function"
    ) {

        savePlayerData();

    }


    if (
        typeof renderApplication ===
        "function"
    ) {

        renderApplication();

    }

}


/* ============================================================
   PUBLIC API
   ============================================================ */

window.MordeManager =
    window.MordeManager || {};


Object.assign(
    window.MordeManager,
    {
        showAddFighter,
        addFighter,
        renderFighters,
        renderFighter,
        showEditFighter,
        saveFighterChanges,
        deleteFighter,
        getAvailableEquipment
    }
);


/* ------------------------------------------------------------
   Backwards compatibility
   ------------------------------------------------------------ */

window.addFighter = addFighter;
window.showAddFighter = showAddFighter;
window.showEditFighter = showEditFighter;
window.saveFighterChanges = saveFighterChanges;
window.deleteFighter = deleteFighter;



/* ============================================================
   LEGACY GLOBAL API
   ============================================================ */

/*
 * Your current UI uses inline onclick handlers such as:
 *
 *     onclick="addFighter('captain')"
 *
 * These assignments keep those handlers working while we
 * gradually move toward the MordeManager namespace.
 */

window.showAddFighter =
    showAddFighter;

window.addFighter =
    addFighter;

window.showEditFighter =
    showEditFighter;

window.saveFighterChanges =
    saveFighterChanges;

window.deleteFighter =
    deleteFighter;

window.renderFighters =
    renderFighters;

window.renderFighter =
    renderFighter;


