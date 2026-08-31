/* ============================================================
   MORDEMANAGER
   Warband Management
   ============================================================ */


/* ============================================================
   DATA NORMALISATION
   ============================================================ */

function normaliseWarbands(warbands) {

    if (!Array.isArray(warbands)) {

        return [];

    }


    return warbands.map(
        (warband, index) => {

            const normalised = {

                id:
                    warband.id ||
                    generateId("warband"),

                name:
                    warband.name ||
                    `Warband ${index + 1}`,

                type:
                    warband.type ||
                    warband.warbandType ||
                    "reikland",

                createdAt:
                    warband.createdAt ||
                    new Date().toISOString(),

                treasury:
                    Number.isFinite(
                        Number(warband.treasury)
                    )
                        ? Number(warband.treasury)
                        : undefined,

                fighters:
                    Array.isArray(
                        warband.fighters
                    )
                        ? warband.fighters
                        : [],

                settlements:
                    Array.isArray(
                        warband.settlements
                    )
                        ? warband.settlements
                        : []

            };


            normalised.fighters =
                normalised.fighters.map(
                    (
                        fighter,
                        fighterIndex
                    ) =>
                        normaliseFighter(
                            fighter,
                            fighterIndex
                        )
                );


            /*
             * Apply starting treasury if no
             * explicit treasury exists.
             */

            if (
                normalised.treasury ===
                undefined
            ) {

                const definition =
                    state.warbandDefinitions[
                        normalised.type
                    ];


                normalised.treasury =
                    Number(
                        definition?.startingTreasury
                    ) || 0;

            }


            return normalised;

        }
    );

}


/* ============================================================
   WARBAND CARDS
   ============================================================ */

function renderWarbandCards() {

    if (!state.warbands.length) {

        return `

            <section class="mm-empty-state">

                <div class="mm-empty-icon">
                    ⚔
                </div>

                <h2>
                    No Warbands Yet
                </h2>

                <p>
                    Create your first warband
                    to get started.
                </p>

                <button
                    class="mm-button mm-button-primary"
                    onclick="showCreateWarband()"
                >
                    Create Warband
                </button>

            </section>

        `;

    }


    return `

        <section class="mm-warband-grid">

            ${state.warbands
                .map(renderWarbandCard)
                .join("")}

        </section>

    `;

}


function renderWarbandCard(warband) {

    const definition =
        state.warbandDefinitions[
            warband.type
        ];


    const fighterCount =
        Array.isArray(warband.fighters)
            ? warband.fighters.length
            : 0;


    const rating =
        calculateWarbandRating(
            warband
        );


    const treasury =
        calculateTreasury(
            warband
        );


    return `

        <article class="mm-card mm-warband-card">

            <div class="mm-card-header">

                <div>

                    <span class="mm-badge">
                        ${escapeHtml(
                            definition?.faction ||
                            "Warband"
                        )}
                    </span>

                    <h2>
                        ${escapeHtml(
                            warband.name
                        )}
                    </h2>

                    <p>
                        ${escapeHtml(
                            definition?.name ||
                            warband.type
                        )}
                    </p>

                </div>

            </div>


            <div class="mm-warband-stats">

                <div>
                    <strong>
                        ${fighterCount}
                    </strong>

                    <span>
                        Fighters
                    </span>
                </div>


                <div>
                    <strong>
                        ${rating}
                    </strong>

                    <span>
                        Rating
                    </span>
                </div>


                <div>
                    <strong>
                        ${treasury} gc
                    </strong>

                    <span>
                        Treasury
                    </span>
                </div>

            </div>


            <div class="mm-card-actions">

                <button
                    class="mm-button mm-button-primary"
                    onclick="openWarband('${escapeAttribute(warband.id)}')"
                >
                    Manage Warband
                </button>

            </div>

        </article>

    `;

}


/* ============================================================
   CREATE WARBAND
   ============================================================ */

function showCreateWarband() {

    openModal(`

        <div class="mm-modal">

            <div class="mm-modal-header">

                <h2>
                    Create Warband
                </h2>

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
                        Warband Name
                    </span>

                    <input
                        id="new-warband-name"
                        type="text"
                        placeholder="The Damned Company"
                        autocomplete="off"
                    >

                </label>


                <label class="mm-field">

                    <span>
                        Warband Type
                    </span>

                    <select
                        id="new-warband-type"
                    >

                        <option value="reikland">
                            Reikland Mercenaries
                        </option>

                    </select>

                </label>

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
                    onclick="createWarband()"
                >
                    Create Warband
                </button>

            </div>

        </div>

    `);

}


function createWarband() {

    const nameInput =
        document.getElementById(
            "new-warband-name"
        );


    const typeInput =
        document.getElementById(
            "new-warband-type"
        );


    if (!nameInput || !typeInput) {

        return;

    }


    const name =
        nameInput.value.trim();


    const type =
        typeInput.value;


    if (!name) {

        nameInput.focus();

        return;

    }


    const definition =
        state.warbandDefinitions[
            type
        ];


    if (!definition) {

        alert(
            "The selected warband definition could not be found."
        );

        return;

    }


    const warband = {

        id:
            generateId("warband"),

        name,

        type,

        createdAt:
            new Date().toISOString(),

        treasury:
            Number(
                definition.startingTreasury
            ) || 0,

        fighters: []

    };


    state.warbands.push(
        warband
    );


    savePlayerData();


    closeModal();


    openWarband(
        warband.id
    );

}


/* ============================================================
   OPEN / CLOSE WARBAND
   ============================================================ */

function openWarband(id) {

    const warband =
        state.warbands.find(
            item =>
                item.id === id
        );


    if (!warband) {

        console.error(
            "Warband not found:",
            id
        );

        return;

    }


    state.currentWarbandId =
        id;

    state.currentGameId =
        null;


    renderApplication();

}


function closeWarband() {

    state.currentWarbandId =
        null;


    renderApplication();

}


/* ============================================================
   WARBAND PAGE
   ============================================================ */

function renderWarbandPage() {

    const warband =
        getCurrentWarband();


    if (!warband) {

        state.currentWarbandId =
            null;

        renderDashboard();

        return;

    }


    const definition =
        state.warbandDefinitions[
            warband.type
        ];


    if (!definition) {

        renderFatalError(
            new Error(
                `Warband definition '${warband.type}' could not be loaded.`
            )
        );

        return;

    }


    const app =
        document.getElementById(
            "app"
        );


    const rating =
        calculateWarbandRating(
            warband
        );


    const totalValue =
        calculateWarbandValue(
            warband
        );


    app.innerHTML = `

        <div class="mm-app">

            <header class="mm-header">

                <div>

                    <button
                        class="mm-back-button"
                        onclick="closeWarband()"
                    >
                        ← My Warbands
                    </button>


                    <div class="mm-logo">
                        ☠
                        ${escapeHtml(
                            warband.name
                        )}
                    </div>


                    <div class="mm-subtitle">
                        ${escapeHtml(
                            definition.name
                        )}
                    </div>

                </div>

            </header>


            <main class="mm-main">

                ${renderWarbandValidation(warband)}

                <section class="mm-warband-overview">

                    <div>

                        <span class="mm-badge">
                            ${escapeHtml(
                                definition.faction
                            )}
                        </span>


                        <h1>
                            ${escapeHtml(
                                warband.name
                            )}
                        </h1>

                    </div>


                    <div class="mm-overview-stats">

                        <div>

                            <span>
                                Fighters
                            </span>

                            <strong>
                                ${warband.fighters.length}
                            </strong>

                        </div>


                        <div>

                            <span>
                                Warband Rating
                            </span>

                            <strong>
                                ${rating}
                            </strong>

                        </div>


                        <div>

                            <span>
                                Warband Value
                            </span>

                            <strong>
                                ${totalValue} gc
                            </strong>

                        </div>


                        <div>

                            <span>
                                Treasury
                            </span>

                            <strong>
                                ${calculateTreasury(
                                    warband
                                )} gc
                            </strong>

                        </div>

                    </div>

                </section>


                <section class="mm-section">

                    <div class="mm-section-header">

                        <div>

                            <h2>
                                Fighters
                            </h2>

                            <p>
                                ${warband.fighters.length}
                                /
                                ${definition.maximumWarbandSize}
                            </p>

                        </div>


                        <button
                            class="mm-button mm-button-primary"
                            onclick="showAddFighter()"
                        >
                            + Add Fighter
                        </button>

                    </div>


                    ${renderFighters(
                        warband
                    )}

                </section>


                <section class="mm-section">

                    <div class="mm-section-header">

                        <div>

                            <h2>
                                Settlements
                            </h2>

                            <p>
                                Territory this warband controls.
                            </p>

                        </div>


                        <button
                            class="mm-button mm-button-primary"
                            onclick="showAddSettlement('${escapeAttribute(warband.id)}')"
                        >
                            + Add Settlement
                        </button>

                    </div>


                    ${renderSettlements(
                        warband
                    )}

                </section>


                <section class="mm-section">

                    <div class="mm-section-header">

                        <div>

                            <h2>
                                Warband Information
                            </h2>

                            <p>
                                Rules and restrictions
                            </p>

                        </div>

                    </div>


                    ${renderWarbandRules(
                        definition
                    )}

                </section>


            </main>

        </div>


        <div id="modal-container"></div>

    `;

}


/* ============================================================
   SETTLEMENTS
   ============================================================ */

function renderSettlements(
    warband
) {

    const settlements =
        Array.isArray(warband.settlements)
            ? warband.settlements
            : [];


    if (!settlements.length) {

        return `

            <div class="mm-empty-state mm-empty-small">

                <div class="mm-empty-icon">
                    ⚑
                </div>

                <h3>
                    No settlements
                </h3>

                <p>
                    This warband does not
                    control any territory yet.
                </p>

            </div>

        `;

    }


    return `

        <div class="mm-settlement-list">

            ${settlements
                .map(
                    settlement =>
                        renderSettlement(
                            warband,
                            settlement
                        )
                )
                .join("")}

        </div>

    `;

}


function renderSettlement(
    warband,
    settlement
) {

    return `

        <article class="mm-settlement-card">

            <div>

                <strong>
                    ${escapeHtml(
                        settlement.name
                    )}
                </strong>

                ${
                    settlement.note
                        ? `
                            <p>
                                ${escapeHtml(
                                    settlement.note
                                )}
                            </p>
                        `
                        : ""
                }

            </div>


            <button
                class="mm-button mm-button-small mm-button-danger"
                onclick="confirmRemoveSettlement('${escapeAttribute(warband.id)}', '${escapeAttribute(settlement.id)}', '${escapeAttribute(settlement.name)}')"
            >
                Remove
            </button>

        </article>

    `;

}


function showAddSettlement(
    warbandId
) {

    openModal(`

        <div class="mm-modal">

            <div class="mm-modal-header">

                <h2>
                    Add Settlement
                </h2>

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
                        Settlement Name
                    </span>

                    <input
                        id="new-settlement-name"
                        type="text"
                        placeholder="Hallow's Fen"
                        autocomplete="off"
                    >

                </label>


                <label class="mm-field">

                    <span>
                        Note
                    </span>

                    <input
                        id="new-settlement-note"
                        type="text"
                        placeholder="Optional"
                        autocomplete="off"
                    >

                </label>

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
                    onclick="addSettlement('${escapeAttribute(warbandId)}')"
                >
                    Add Settlement
                </button>

            </div>

        </div>

    `);

}


function addSettlement(
    warbandId
) {

    const warband =
        state.warbands.find(
            item =>
                item.id === warbandId
        );


    if (!warband) {

        return;

    }


    const nameInput =
        document.getElementById(
            "new-settlement-name"
        );


    const noteInput =
        document.getElementById(
            "new-settlement-note"
        );


    const name =
        nameInput?.value.trim();


    if (!name) {

        nameInput?.focus();

        return;

    }


    if (!Array.isArray(warband.settlements)) {

        warband.settlements = [];

    }


    warband.settlements.push({

        id:
            generateId("settlement"),

        name,

        note:
            noteInput?.value.trim() || ""

    });


    savePlayerData();


    closeModal();


    renderApplication();

}


function confirmRemoveSettlement(
    warbandId,
    settlementId,
    settlementName
) {

    openModal(`

        <div class="mm-modal">

            <div class="mm-modal-header">

                <h2>
                    Remove Settlement
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
                    ${escapeHtml(settlementName)}
                    from this warband?
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
                    onclick="removeSettlement('${escapeAttribute(warbandId)}', '${escapeAttribute(settlementId)}')"
                >
                    Remove
                </button>

            </div>

        </div>

    `);

}


function removeSettlement(
    warbandId,
    settlementId
) {

    const warband =
        state.warbands.find(
            item =>
                item.id === warbandId
        );


    if (!warband) {

        return;

    }


    warband.settlements =
        (warband.settlements || [])
            .filter(
                settlement =>
                    settlement.id !== settlementId
            );


    savePlayerData();


    renderApplication();

}


/* ============================================================
   WARBAND RULES
   ============================================================ */

function renderWarbandRules(
    definition
) {

    return `

        <div class="mm-rules-card">

            <div class="mm-rule-stat">

                <span>
                    Starting Treasury
                </span>


                <strong>
                    ${definition.startingTreasury} gc
                </strong>

            </div>


            <div class="mm-rule-stat">

                <span>
                    Maximum Warband Size
                </span>


                <strong>
                    ${definition.maximumWarbandSize}
                </strong>

            </div>


            <div class="mm-rule-block">

                <h3>
                    Fighter Restrictions
                </h3>


                <div class="mm-restrictions">

                    ${(definition.fighterTypes || [])
                        .map(
                            type => `

                                <div>

                                    <span>
                                        ${escapeHtml(
                                            type.name
                                        )}
                                    </span>


                                    <strong>

                                        ${type.min ?? 0}

                                        -

                                        ${
                                            type.max === null ||
                                            type.max === undefined
                                                ? "∞"
                                                : type.max
                                        }

                                    </strong>

                                </div>

                            `
                        )
                        .join("")}

                </div>

            </div>


            ${renderSourceInformation(
                definition
            )}

        </div>

    `;

}


/* ============================================================
   WARBAND VALIDATION
   ============================================================ */

function validateCurrentWarband(
    warband
) {

    if (
        typeof RulesEngine === "undefined" ||
        typeof RulesEngine.validateWarband !== "function"
    ) {

        console.warn(
            "RulesEngine.validateWarband is not available."
        );

        return {
            valid: true,
            errors: [],
            warnings: [],
            info: []
        };

    }


    const definition =
        state.warbandDefinitions[
            warband?.type
        ];


    if (!definition) {

        return {
            valid: false,
            errors: [
                {
                    code: "MISSING_DEFINITION",
                    message:
                        "The warband rules definition could not be found."
                }
            ],
            warnings: [],
            info: []
        };

    }


    return RulesEngine.validateWarband(
        warband,
        definition,
        state.equipment
    );

}
