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
   WARBAND CALCULATIONS
   ============================================================ */

function calculateFighterCost(fighter) {

    if (!fighter) {

        return 0;

    }


    const baseCost =
        Number(fighter.baseCost) || 0;


    const equipmentCost =
        (fighter.equipment || [])
            .reduce(

                (total, equipmentId) => {

                    const item =
                        getEquipment(equipmentId);

                    return total +
                        (Number(item?.cost) || 0);

                },

                0

            );


    return baseCost + equipmentCost;

}


function calculateWarbandValue(warband) {

    if (!warband) {

        return 0;

    }


    const fighters =
        Array.isArray(warband.fighters)
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

    if (!warband) {

        return 0;

    }


    const fighters =
        Array.isArray(warband.fighters)
            ? warband.fighters
            : [];


    /*
     * This is deliberately kept simple for now.
     *
     * Later we can implement the exact campaign
     * warband rating calculation from the rules.
     */

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


function getFighterType(
    warband,
    fighter
) {

    if (!warband || !fighter) {

        return null;

    }


    const definition =
        state.warbandDefinitions[
            warband.type
        ];


    return definition?.fighterTypes?.find(
        type =>
            type.id === fighter.type
    ) || null;

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


/* ============================================================
   WARBand VALIDATION
   ============================================================ */

function validateWarband(warband) {

    const errors = [];
    const warnings = [];


    if (!warband) {

        errors.push(
            "Warband could not be found."
        );

        return {
            valid: false,
            errors,
            warnings
        };

    }


    const definition =
        state.warbandDefinitions[
            warband.type
        ];


    if (!definition) {

        errors.push(
            "Warband rules definition could not be found."
        );

        return {
            valid: false,
            errors,
            warnings
        };

    }


    const fighters =
        Array.isArray(warband.fighters)
            ? warband.fighters
            : [];


    /* --------------------------------------------------------
       TOTAL SIZE
       -------------------------------------------------------- */

    if (
        fighters.length <
        definition.minimumWarbandSize
    ) {

        errors.push(
            `Warband requires at least ${definition.minimumWarbandSize} fighters.`
        );

    }


    if (
        fighters.length >
        definition.maximumWarbandSize
    ) {

        errors.push(
            `Warband cannot contain more than ${definition.maximumWarbandSize} fighters.`
        );

    }


    /* --------------------------------------------------------
       FIGHTER TYPE LIMITS
       -------------------------------------------------------- */

    for (
        const fighterType
        of definition.fighterTypes || []
    ) {

        const count =
            fighters.filter(
                fighter =>
                    fighter.type ===
                    fighterType.id
            ).length;


        if (
            fighterType.min !== null &&
            fighterType.min !== undefined &&
            count < fighterType.min
        ) {

            errors.push(
                `You need at least ${fighterType.min} ${fighterType.name}.`
            );

        }


        if (
            fighterType.max !== null &&
            fighterType.max !== undefined &&
            count > fighterType.max
        ) {

            errors.push(
                `You can have no more than ${fighterType.max} ${fighterType.name}.`
            );

        }

    }


    return {

        valid: errors.length === 0,

        errors,

        warnings

    };

}


function renderWarbandValidation(warband) {

    const result =
        validateWarband(warband);


    if (result.valid) {

        return `

            <div class="mm-validation mm-validation-success">

                <strong>
                    ✓ Warband currently legal
                </strong>

            </div>

        `;

    }


    return `

        <div class="mm-validation mm-validation-error">

            <strong>
                ⚠ Warband needs attention
            </strong>

            <ul>

                ${result.errors
                    .map(
                        error =>
                            `<li>
                                ${escapeHtml(error)}
                            </li>`
                    )
                    .join("")}

            </ul>

        </div>

    `;

}
