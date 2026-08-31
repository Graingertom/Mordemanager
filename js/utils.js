/* ============================================================
   MORDEMANAGER
   Shared Utilities
   ============================================================ */


/* ============================================================
   ID GENERATION
   ============================================================ */

function generateId(prefix = "id") {

    return `${prefix}-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)}`;

}


/* ============================================================
   HTML / ATTRIBUTE SAFETY
   ============================================================ */

function escapeHtml(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


function escapeAttribute(value) {

    return escapeHtml(value);

}


/* ============================================================
   DATES
   ============================================================ */

function formatDate(dateString) {

    if (!dateString) {

        return "Unknown";

    }


    const date =
        new Date(dateString);


    if (Number.isNaN(date.getTime())) {

        return "Unknown";

    }


    return date.toLocaleDateString();

}


/* ============================================================
   CURRENT WARBAND
   ============================================================ */

function getCurrentWarband() {

    if (
        typeof state === "undefined" ||
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


/* ============================================================
   CURRENT GAME
   ============================================================ */

function getCurrentGame() {

    if (
        typeof state === "undefined" ||
        !state.currentGameId
    ) {

        return null;

    }


    return state.games.find(
        game =>
            game.id ===
            state.currentGameId
    ) || null;

}


/* ============================================================
   CURRENT PLAYER
   ============================================================ */

/*
 * There is no real account system yet. This is a
 * lightweight, local stand-in so a game with warbands
 * belonging to different people can still tell "yours"
 * apart from everyone else's - it is not authentication,
 * just a name this browser remembers.
 */

function getCurrentPlayerName() {

    try {

        return localStorage.getItem(
            "mordemanager-player-name"
        ) || "";

    } catch (error) {

        return "";

    }

}


function setCurrentPlayerName(name) {

    try {

        localStorage.setItem(
            "mordemanager-player-name",
            name || ""
        );

    } catch (error) {

        console.warn(
            "Unable to save player name:",
            error
        );

    }

}


function ownsWarband(warband) {

    if (!warband?.owner) {

        return true;

    }


    return warband.owner ===
        getCurrentPlayerName();

}


/* ============================================================
   WARBAND CALCULATIONS
   ============================================================ */

function calculateFighterCost(fighter) {

    if (
        typeof RulesEngine !== "undefined" &&
        typeof RulesEngine.calculateFighterCost === "function"
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

                (total, equipmentId) => {

                    const item =
                        getEquipment(equipmentId);

                    return total +
                        (Number(item?.cost) || 0);

                },

                0

            );


    return (Number(fighter?.baseCost) || 0) + equipmentCost;

}


function calculateWarbandValue(warband) {

    if (
        typeof RulesEngine !== "undefined" &&
        typeof RulesEngine.calculateWarbandValue === "function"
    ) {

        return RulesEngine.calculateWarbandValue(
            warband,
            state.equipment
        );

    }


    const fighters =
        Array.isArray(warband?.fighters)
            ? warband.fighters
            : [];


    return fighters.reduce(

        (total, fighter) => {

            return total +
                calculateFighterCost(fighter);

        },

        0

    );

}


function calculateWarbandRating(warband) {

    if (
        typeof RulesEngine !== "undefined" &&
        typeof RulesEngine.calculateWarbandRating === "function"
    ) {

        return RulesEngine.calculateWarbandRating(
            warband,
            state.equipment
        );

    }


    const fighters =
        Array.isArray(warband?.fighters)
            ? warband.fighters
            : [];


    const fighterValue =
        calculateWarbandValue(warband);


    const experience =
        fighters.reduce(

            (total, fighter) => {

                return total +
                    (Number(fighter.experience) || 0);

            },

            0

        );


    return Math.max(
        0,
        fighterValue + experience
    );

}


function calculateTreasury(warband) {

    return Number(
        warband?.treasury
    ) || 0;

}


/* ============================================================
   FIGHTER HELPERS
   ============================================================ */

function generateDefaultFighterName(
    fighterType,
    warband
) {

    if (!fighterType || !warband) {

        return "Fighter";

    }


    const count =
        (warband.fighters || [])
            .filter(
                fighter =>
                    fighter.type ===
                    fighterType.id
            )
            .length + 1;


    return `${fighterType.name} ${count}`;

}


/* ============================================================
   MODAL HELPERS
   ============================================================ */

function openModal(content) {

    const container =
        document.getElementById(
            "modal-container"
        );


    if (!container) {

        console.error(
            "Modal container not found."
        );

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


    if (typeof state !== "undefined") {

        state.currentModal = true;

    }


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


    if (typeof state !== "undefined") {

        state.currentModal = null;

    }


    document.body.classList.remove(
        "mm-modal-open"
    );

}


function handleModalBackdrop(event) {

    if (
        event.target.classList.contains(
            "mm-modal-backdrop"
        )
    ) {

        closeModal();

    }

}


/* ============================================================
   SOURCE INFORMATION
   ============================================================ */

function renderSourceInformation(sourceObject) {

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

                ?

                `
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

                :

                ""
            }

        </div>

    `;

}


/* ============================================================
   ACKNOWLEDGEMENT
   ============================================================ */

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
                Mordheim and its original rules
                are property of their respective
                rights holders.
            </p>

        </footer>

    `;

}


