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
   WARBAND OWNERSHIP
   ============================================================ */

/*
 * Ownership is still just a free-text name on the warband
 * itself (see warbands.js) rather than a real foreign key -
 * that part waits for the data layer to move to Supabase. But
 * "who am I" now comes from the real signed-in identity
 * (js/auth.js) rather than a separate local name.
 */

function ownsWarband(warband) {

    /*
     * A missing ownerId means this is a stub (search_warbands,
     * get_warband_stubs, a friend's warband, etc.) - never assume
     * ownership just because we don't know who owns it.
     */

    if (!warband?.ownerId) {

        return false;

    }


    const user =
        getCurrentUser();


    return !!user &&
        warband.ownerId === user.id;

}


function isGameMaster(game) {

    if (!game?.gameMasterId) {

        return false;

    }


    const user =
        getCurrentUser();


    return !!user &&
        game.gameMasterId === user.id;

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


    const fighterValue =
        fighters.reduce(

            (total, fighter) => {

                return total +
                    calculateFighterCost(fighter);

            },

            0

        );


    const stashValue =
        (warband?.stash || [])
            .reduce(

                (total, equipmentId) => {

                    const item =
                        getEquipment(equipmentId);

                    return total +
                        (Number(item?.cost) || 0);

                },

                0

            );


    return fighterValue + stashValue;

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

/*
 * A stack of previous modals' rendered HTML, so a "drill-down"
 * modal (equipment -> trait, fighter details -> equipment, etc.)
 * can offer a way back to what opened it instead of the only
 * option being to close everything.
 */

let modalStack = [];


function modalCanGoBack() {

    const container =
        document.getElementById(
            "modal-container"
        );


    return !!(
        container &&
        container.innerHTML.trim()
    );

}


function renderModalContent(content) {

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


function openModal(content) {

    modalStack = [];

    renderModalContent(content);

}


/*
 * Like openModal, but keeps whatever modal is currently open
 * on a stack so goBackModal() can return to it. If nothing is
 * currently open, this behaves exactly like openModal.
 */

function pushModal(content) {

    const container =
        document.getElementById(
            "modal-container"
        );


    if (
        container &&
        container.innerHTML.trim()
    ) {

        modalStack.push(
            container.innerHTML
        );

    }


    renderModalContent(content);

}


function goBackModal() {

    const previous =
        modalStack.pop();


    if (!previous) {

        closeModal();

        return;

    }


    const container =
        document.getElementById(
            "modal-container"
        );


    if (container) {

        container.innerHTML =
            previous;

    }

}


function closeModal() {

    modalStack = [];


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

/*
 * `page`, when known, is the page number within source.url's PDF.
 * Browsers' built-in PDF viewers (Chrome/Firefox/Edge) honour a
 * #page=N fragment and jump straight there - so a page number
 * turns a link to "the whole rulebook" into a link to the exact
 * page. Left undefined wherever we don't have a page number we
 * actually trust, rather than guessing.
 */

function renderSourceInformation(
    sourceObject,
    page
) {

    const source =
        sourceObject?.source;


    if (!source) {

        return "";

    }


    const pageNumber =
        page ??
        sourceObject?.sourcePage;


    const url =
        source.url && pageNumber
            ? `${source.url}#page=${encodeURIComponent(pageNumber)}`
            : source.url;


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
                ${
                    pageNumber
                        ? ` (p.${escapeHtml(pageNumber)})`
                        : ""
                }
            </p>

            ${
                url

                ?

                `
                    <a
                        href="${escapeAttribute(
                            url
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
   SPECIAL RULES
   ============================================================ */

function renderSpecialRules(specialRules) {

    const rules =
        Array.isArray(specialRules)
            ? specialRules
            : [];


    if (!rules.length) {

        return "";

    }


    return `

        <div class="mm-special-rules">

            ${rules
                .map(
                    rule => `

                        <div class="mm-special-rule">

                            <strong>
                                ${escapeHtml(
                                    rule.name ||
                                    rule.id ||
                                    "Special Rule"
                                )}
                            </strong>

                            ${
                                rule.summary
                                    ? `
                                        <p>
                                            ${escapeHtml(
                                                rule.summary
                                            )}
                                        </p>
                                    `
                                    : ""
                            }

                        </div>

                    `
                )
                .join("")}

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


