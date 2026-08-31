/* ============================================================
   MORDEMANAGER
   Iteration 2 - Data Driven Warband Manager
   ============================================================ */

const APP_VERSION = "0.2.1";


/* ============================================================
   DATA PATHS
   ============================================================ */

const DATA_PATHS = {

    core: "./data/rules/core.json",

    equipment: "./data/rules/equipment.json",

    skills: "./data/rules/skills.json",

    reikland: "./data/rules/warbands/reikland.json",

    playerWarbands: "./data/app/warbands.json",

    games: "./data/app/games.json"

};


/* ============================================================
   APPLICATION STATE
   ============================================================ */

const state = {

    core: null,

    equipment: null,

    skills: null,

    warbandDefinitions: {
        reikland: null
    },

    warbands: [],

    games: [],

    currentWarbandId: null,

    currentModal: null

};


/* ============================================================
   INITIALISATION
   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    initialise
);


async function initialise() {

    console.log(
        `Mordemanager ${APP_VERSION} starting...`
    );


    try {

        await loadRules();

        await loadPlayerData();

        renderApplication();

    } catch (error) {

        console.error(
            "Application failed to initialise:",
            error
        );

        renderFatalError(error);

    }

}


/* ============================================================
   DATA LOADING
   ============================================================ */

async function loadRules() {

    const responses = await Promise.all([

        fetch(DATA_PATHS.core),

        fetch(DATA_PATHS.equipment),

        fetch(DATA_PATHS.skills),

        fetch(DATA_PATHS.reikland)

    ]);


    const paths = [

        DATA_PATHS.core,

        DATA_PATHS.equipment,

        DATA_PATHS.skills,

        DATA_PATHS.reikland

    ];


    responses.forEach(
        (response, index) => {

            if (!response.ok) {

                throw new Error(
                    `Unable to load ${paths[index]} (${response.status})`
                );

            }

        }
    );


    const [

        core,

        equipment,

        skills,

        reikland

    ] = await Promise.all(

        responses.map(
            response =>
                response.json()
        )

    );


    state.core = core;

    state.equipment = equipment;

    state.skills = skills;

    state.warbandDefinitions.reikland =
        reikland;


    console.log(
        "Rules loaded successfully."
    );

}


/* ============================================================
   PLAYER DATA
   ============================================================ */

async function loadPlayerData() {

    let storedData = null;


    /*
     * Try localStorage first.
     */

    try {

        storedData =
            localStorage.getItem(
                "mordemanager-warbands"
            );

    } catch (error) {

        console.warn(
            "localStorage unavailable:",
            error
        );

    }


    if (storedData) {

        try {

            const parsed =
                JSON.parse(storedData);


            state.warbands =
                normaliseWarbands(
                    parsed.warbands || []
                );

        } catch (error) {

            console.warn(
                "Saved warband data could not be parsed.",
                error
            );

            state.warbands = [];

        }

    } else {

        /*
         * No saved local data.
         *
         * Load initial development data.
         */

        try {

            const response =
                await fetch(
                    DATA_PATHS.playerWarbands
                );


            if (response.ok) {

                const data =
                    await response.json();


                state.warbands =
                    normaliseWarbands(
                        data.warbands || []
                    );

            } else {

                console.warn(
                    "Initial warbands file returned:",
                    response.status
                );

                state.warbands = [];

            }

        } catch (error) {

            console.warn(
                "No initial player warbands found."
            );

            state.warbands = [];

        }

    }


    /*
     * Games remain separate for now.
     */

    try {

        const response =
            await fetch(
                DATA_PATHS.games
            );


        if (response.ok) {

            const data =
                await response.json();


            state.games =
                Array.isArray(data.games)
                    ? data.games
                    : [];

        } else {

            state.games = [];

        }

    } catch (error) {

        console.warn(
            "Games data could not be loaded."
        );

        state.games = [];

    }

}


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
   PERSISTENCE
   ============================================================ */

function savePlayerData() {

    try {

        localStorage.setItem(

            "mordemanager-warbands",

            JSON.stringify({

                warbands:
                    state.warbands

            })

        );


        console.log(
            "Warbands saved."
        );

    } catch (error) {

        console.error(
            "Unable to save warbands:",
            error
        );

    }

}


/* ============================================================
   APPLICATION RENDERING
   ============================================================ */

function renderApplication() {

    const app =
        document.getElementById("app");


    if (!app) {

        throw new Error(
            "Could not find #app in index.html"
        );

    }


    if (state.currentWarbandId) {

        renderWarbandPage();

    } else {

        renderDashboard();

    }

}


/* ============================================================
   DASHBOARD
   ============================================================ */

function renderDashboard() {

    const app =
        document.getElementById("app");


    app.innerHTML = `

        <div class="mm-app">

            <header class="mm-header">

                <div>

                    <div class="mm-logo">
                        ☠ MORDEMANAGER
                    </div>

                    <div class="mm-subtitle">
                        Mordheim Warband Manager
                    </div>

                </div>


                <div class="mm-header-actions">

                    <button
                        class="mm-button mm-button-primary"
                        onclick="showCreateWarband()"
                    >
                        + New Warband
                    </button>

                </div>

            </header>


            <main class="mm-main">

                <section class="mm-page-title">

                    <div>

                        <h1>
                            My Warbands
                        </h1>

                        <p>
                            Manage your warbands,
                            fighters, equipment
                            and campaigns.
                        </p>

                    </div>

                </section>


                ${renderWarbandCards()}


                ${renderActiveGames()}


                ${renderAcknowledgement()}

            </main>

        </div>


        <div id="modal-container"></div>

    `;

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
   OPEN WARBAND
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
   FIGHTERS
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
    onclick="showFighterDetails('${fighter.id}')"
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
   EQUIPMENT
   ============================================================ */

function renderEquipmentTag(
    equipmentId
) {

    const item =
        getEquipment(
            equipmentId
        );


    if (!item) {

        return `

            <span class="mm-equipment-tag">
                ${escapeHtml(
                    equipmentId
                )}
            </span>

        `;

    }


    return `

        <button
            class="mm-equipment-tag"
            onclick="showEquipment('${escapeAttribute(item.id)}')"
        >

            ${escapeHtml(
                item.name
            )}

            ${
                item.traits?.length

                    ? `

                        <span class="mm-trait-dot">
                            ●
                        </span>

                    `
                    : ""
            }

        </button>

    `;

}


function getEquipment(id) {

    const equipment =
        state.equipment;


    if (!equipment) {

        return null;

    }


    /*
     * Current data format:
     *
     * {
     *     equipment: [...]
     * }
     */

    if (
        Array.isArray(
            equipment.equipment
        )
    ) {

        return equipment.equipment.find(
            item =>
                item.id === id
        ) || null;

    }


    /*
     * Also support a future direct
     * object structure.
     */

    if (
        equipment.items &&
        typeof equipment.items ===
            "object"
    ) {

        return equipment.items[id]
            || null;

    }


    return null;

}


/* ============================================================
   EQUIPMENT MODAL
   ============================================================ */

function showEquipment(id) {

    const item =
        getEquipment(id);


    if (!item) {

        return;

    }


    const traits =
        Array.isArray(item.traits)
            ? item.traits
            : [];


    openModal(`

        <div class="mm-modal">

            <div class="mm-modal-header">

                <div>

                    <span class="mm-badge">
                        ${escapeHtml(
                            item.category ||
                            "Equipment"
                        )}
                    </span>


                    <h2>
                        ${escapeHtml(
                            item.name
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

                <div class="mm-rule-stat">

                    <span>
                        Cost
                    </span>

                    <strong>
                        ${item.cost ?? 0} gc
                    </strong>

                </div>


                <div class="mm-rule-stat">

                    <span>
                        Availability
                    </span>

                    <strong>
                        ${escapeHtml(
                            item.availability ||
                            "Unknown"
                        )}
                    </strong>

                </div>


                ${
                    item.description

                        ? `

                            <div class="mm-rule-block">

                                <h3>
                                    Description
                                </h3>

                                <p>
                                    ${escapeHtml(
                                        item.description
                                    )}
                                </p>

                            </div>

                        `
                        : ""
                }


                ${
                    traits.length

                        ? `

                            <div class="mm-rule-block">

                                <h3>
                                    Traits
                                </h3>


                                <div class="mm-trait-list">

                                    ${traits
                                        .map(
                                            renderTraitButton
                                        )
                                        .join("")}

                                </div>

                            </div>

                        `
                        : ""
                }


                ${renderSourceInformation(
                    item
                )}

            </div>

        </div>

    `);

}


/* ============================================================
   TRAITS
   ============================================================ */

function getTrait(
    traitId
) {

    const traits =
        state.equipment?.traits;


    if (!traits) {

        return null;

    }


    if (
        Array.isArray(traits)
    ) {

        return traits.find(
            trait =>
                trait.id === traitId
        ) || null;

    }


    return traits[traitId]
        || null;

}


function renderTraitButton(
    traitId
) {

    const trait =
        getTrait(traitId);


    if (!trait) {

        return `

            <span class="mm-trait">
                ${escapeHtml(
                    traitId
                )}
            </span>

        `;

    }


    return `

        <button
            class="mm-trait"
            onclick="showTrait('${escapeAttribute(traitId)}')"
        >
            ${escapeHtml(
                trait.name ||
                traitId
            )}
        </button>

    `;

}


function showTrait(
    id
) {

    const trait =
        getTrait(id);


    if (!trait) {

        return;

    }


    openModal(`

        <div class="mm-modal">

            <div class="mm-modal-header">

                <h2>
                    ${escapeHtml(
                        trait.name ||
                        id
                    )}
                </h2>


                <button
                    class="mm-modal-close"
                    onclick="closeModal()"
                >
                    ×
                </button>

            </div>


            <div class="mm-modal-body">

                ${
                    trait.summary

                        ? `

                            <p class="mm-rule-description">

                                ${escapeHtml(
                                    trait.summary
                                )}

                            </p>

                        `
                        : ""
                }


                ${
                    trait.description

                        ? `

                            <p class="mm-rule-description">

                                ${escapeHtml(
                                    trait.description
                                )}

                            </p>

                        `
                        : ""
                }


                ${renderSourceInformation(
                    trait
                )}

            </div>

        </div>

    `);

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


}


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


/*
 * Kept as a compatibility helper in case
 * other parts of the application still call it.
 */

function renderEditableStat(
    id,
    stat,
    value
) {

    return renderReadOnlyStat(
        stat,
        value
    );

}


/* ============================================================
   EQUIPMENT EDITOR
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


    const confirmed =
        confirm(
            `Remove ${fighter.name} from the warband?`
        );


    if (!confirmed) {

        return;

    }


    try {

        if (
            typeof MordeManager ===
            "undefined"
        ) {

            throw new Error(
                "MordeManager is not loaded."
            );

        }


        MordeManager.removeFighter(
            warband,
            fighterId
        );

        const validation =
    validateCurrentWarband(
        warband
    );


if (validation.errors.length) {

    const proceed =
        confirm(
            "This change creates rule errors:\n\n" +
            validation.errors
                .map(
                    error =>
                        `• ${error.message}`
                )
                .join("\n") +
            "\n\nSave anyway?"
        );


    if (!proceed) {

        return;

    }

}



        savePlayerData();


        renderApplication();

    } catch (error) {

        console.error(
            "Unable to remove fighter:",
            error
        );


        alert(
            error.message
        );

    }

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

function renderWarbandValidation(
    warband
) {

    const result =
        validateCurrentWarband(
            warband
        );


    let statusClass;
    let icon;
    let title;


    if (result.errors.length) {

        statusClass =
            "mm-validation-error";

        icon = "✕";

        title =
            "Warband has rule errors.";

    } else if (result.warnings.length) {

        statusClass =
            "mm-validation-warning";

        icon = "!";

        title =
            "Warband is valid with warnings.";

    } else {

        statusClass =
            "mm-validation-valid";

        icon = "✓";

        title =
            "Warband is valid.";

    }


    const messages = [
        ...result.errors,
        ...result.warnings,
        ...result.info
    ];


    return `

        <section
            class="
                mm-validation
                ${statusClass}
            "
        >

            <div class="mm-validation-icon">
                ${icon}
            </div>


            <div class="mm-validation-content">

                <div class="mm-validation-header">

                    <div>

                        <strong>
                            ${title}
                        </strong>

                        <p>
                            ${result.errors.length}
                            error${result.errors.length === 1 ? "" : "s"},
                            ${result.warnings.length}
                            warning${result.warnings.length === 1 ? "" : "s"}
                        </p>

                    </div>

                </div>


                ${
                    messages.length

                        ? `

                            <div class="mm-validation-list">

                                ${messages
                                    .map(
                                        item => `

                                            <div
                                                class="
                                                    mm-validation-item
                                                "
                                            >

                                                <span
                                                    class="
                                                        mm-validation-item-icon
                                                    "
                                                >
                                                    ${
                                                        result.errors.includes(item)
                                                            ? "✕"
                                                            : "!"
                                                    }
                                                </span>


                                                <span
                                                    class="
                                                        mm-validation-message
                                                    "
                                                >
                                                    ${escapeHtml(
                                                        item.message
                                                    )}
                                                </span>

                                            </div>

                                        `
                                    )
                                    .join("")}

                            </div>

                        `
                        : ""
                }

            </div>

        </section>

    `;

}




/* ============================================================
   RULES ENGINE CALCULATIONS
   ============================================================ */

function calculateFighterCost(
    fighter
) {

    if (
        typeof RulesEngine !==
        "undefined" &&
        typeof RulesEngine.calculateFighterCost ===
            "function"
    ) {

        return RulesEngine.calculateFighterCost(
            fighter,
            state.equipment
        );

    }


    /*
     * Fallback for development if the
     * rules engine has not loaded yet.
     */

    const equipmentCost =
        (fighter?.equipment || [])
            .reduce(
                (
                    total,
                    equipmentId
                ) => {

                    const item =
                        getEquipment(
                            equipmentId
                        );


                    return total +
                        (
                            Number(
                                item?.cost
                            ) || 0
                        );

                },
                0
            );


    return (
        Number(
            fighter?.baseCost
        ) || 0
    ) + equipmentCost;

}


function calculateWarbandValue(
    warband
) {

    if (
        typeof RulesEngine !==
        "undefined" &&
        typeof RulesEngine.calculateWarbandValue ===
            "function"
    ) {

        return RulesEngine.calculateWarbandValue(
            warband,
            state.equipment
        );

    }


    const fighters =
        Array.isArray(
            warband?.fighters
        )
            ? warband.fighters
            : [];


    return fighters.reduce(
        (
            total,
            fighter
        ) => {

            return total +
                calculateFighterCost(
                    fighter
                );

        },
        0
    );

}


function calculateWarbandRating(
    warband
) {

    if (
        typeof RulesEngine !==
        "undefined" &&
        typeof RulesEngine.calculateWarbandRating ===
            "function"
    ) {

        return RulesEngine.calculateWarbandRating(
            warband,
            state.equipment
        );

    }


    const fighters =
        Array.isArray(
            warband?.fighters
        )
            ? warband.fighters
            : [];


    const fighterValue =
        calculateWarbandValue(
            warband
        );


    const experience =
        fighters.reduce(
            (
                total,
                fighter
            ) => {

                return total +
                    (
                        Number(
                            fighter.experience
                        ) || 0
                    );

            },
            0
        );


    return Math.max(
        0,
        fighterValue +
        experience
    );

}


function calculateTreasury(
    warband
) {

    return Number(
        warband?.treasury
    ) || 0;

}


/* ============================================================
   ACTIVE GAMES
   ============================================================ */

function renderActiveGames() {

    const activeGames =
        state.games.filter(
            game =>
                game.status ===
                "active"
        );


    return `

        <section class="mm-section">

            <div class="mm-section-header">

                <div>

                    <h2>
                        Active Games
                    </h2>


                    <p>
                        Games currently
                        in progress.
                    </p>

                </div>

            </div>


            ${
                activeGames.length

                    ? activeGames
                        .map(
                            renderGameCard
                        )
                        .join("")

                    : `

                        <div
                            class="
                                mm-empty-state
                                mm-empty-small
                            "
                        >

                            <div class="mm-empty-icon">
                                ⚔
                            </div>


                            <p>
                                No active games.
                            </p>

                        </div>

                    `
            }

        </section>

    `;

}


function renderGameCard(
    game
) {

    return `

        <article class="mm-card">

            <span class="mm-badge">
                Active
            </span>


            <h3>
                ${escapeHtml(
                    game.scenario ||
                    "Game"
                )}
            </h3>


            <p>

                Started

                ${formatDate(
                    game.startedAt
                )}

            </p>

        </article>

    `;

}


/* ============================================================
   SOURCE / ACKNOWLEDGEMENT
   ============================================================ */

function renderSourceInformation(
    sourceObject
) {

    const source =
        sourceObject?.source;


    if (!source) {

        return "";

    }


    return `

        <div class="mm-source">

            <strong>
                Rules Source
            </strong>


            <p>
                ${escapeHtml(
                    source.document ||
                    "Mordheim Rules"
                )}
            </p>


            ${
                source.url

                    ? `

                        <a
                            href="${escapeAttribute(
                                source.url
                            )}"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            View source ↗
                        </a>

                    `
                    : ""
            }

        </div>

    `;

}


function renderAcknowledgement() {

    return `

        <footer class="mm-acknowledgement">

            <p>
                Mordemanager is a fan-made
                warband management application.
            </p>


            <p>
                Rules references are based on
                Mordheim material made available
                through
                <a
                    href="https://broheim.net"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Broheim
                </a>.
            </p>


            <p>
                We gratefully acknowledge Broheim
                and the work of the Mordheim community
                in preserving and making these materials
                available.
            </p>


            <p>
                Mordheim and its original rules
                are property of their respective
                rights holders.
            </p>

        </footer>

    `;

}


/* ============================================================
   MODALS
   ============================================================ */

function openModal(
    content
) {

    const container =
        document.getElementById(
            "modal-container"
        );


    if (!container) {

        return;

    }


    container.innerHTML = `

        <div
            class="mm-modal-backdrop"
            onclick="handleModalBackdrop(event)"
        >

            ${content}

        </div>

    `;


    state.currentModal =
        true;


    document.body.classList.add(
        "mm-modal-open"
    );

}


function closeModal() {

    const container =
        document.getElementById(
            "modal-container"
        );


    if (container) {

        container.innerHTML = "";

    }


    state.currentModal =
        null;


    document.body.classList.remove(
        "mm-modal-open"
    );

}


function handleModalBackdrop(
    event
) {

    if (
        event.target.classList.contains(
            "mm-modal-backdrop"
        )
    ) {

        closeModal();

    }

}


/* ============================================================
   NAVIGATION
   ============================================================ */

function closeWarband() {

    state.currentWarbandId =
        null;


    renderApplication();

}


/* ============================================================
   HELPERS
   ============================================================ */

function getCurrentWarband() {

    if (
        !state.currentWarbandId
    ) {

        return null;

    }


    return state.warbands.find(
        warband =>
            warband.id ===
            state.currentWarbandId
    ) || null;

}


function generateId(
    prefix = "id"
) {

    return `${prefix}-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)}`;

}


function generateDefaultFighterName(
    fighterType,
    warband
) {

    const count =
        warband.fighters.filter(
            fighter =>
                fighter.type ===
                fighterType.id
        ).length + 1;


    return `${fighterType.name} ${count}`;

}


function formatDate(
    dateString
) {

    if (!dateString) {

        return "Unknown";

    }


    const date =
        new Date(
            dateString
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "Unknown";

    }


    return date.toLocaleDateString();

}


/* ============================================================
   SECURITY / HTML HELPERS
   ============================================================ */

function escapeHtml(
    value
) {

    return String(
        value ?? ""
    )
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

}


function escapeAttribute(
    value
) {

    return escapeHtml(
        value
    );

}


/* ============================================================
   FATAL ERROR
   ============================================================ */

function renderFatalError(
    error
) {

    const app =
        document.getElementById(
            "app"
        );


    if (!app) {

        return;

    }


    app.innerHTML = `

        <div class="mm-error-page">

            <h1>
                ☠ Mordemanager
            </h1>


            <h2>
                Unable to load the application
            </h2>


            <p>
                ${escapeHtml(
                    error?.message ||
                    error ||
                    "Unknown error"
                )}
            </p>


            <p>
                Check the browser console
                for more information.
            </p>

        </div>

    `;

}


/* ============================================================
   DEBUG API
   ============================================================ */

/* ============================================================
   PUBLIC DEBUG / APPLICATION API
   ============================================================ */

window.MordeManager =
    window.MordeManager || {};


/*
 * Add the application-level functions to the existing
 * MordeManager object.
 *
 * IMPORTANT:
 * Do not replace window.MordeManager with a new object here.
 * Other modules such as fighters.js and equipment.js may
 * already have registered their functions on it.
 */

Object.assign(
    window.MordeManager,
    {

        state,

        savePlayerData,

        calculateWarbandRating,

        calculateWarbandValue,

        calculateFighterCost,

        getEquipment,

        openWarband,

        closeWarband,

        showEquipment,

        showTrait

    }
);



console.log(
    `Mordemanager ${APP_VERSION} loaded.`
);
