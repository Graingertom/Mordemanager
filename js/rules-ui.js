/* ============================================================
   MORDEMANAGER
   Rules UI
   ============================================================ */


/* ============================================================
   WARBAND VALIDATION PANEL
   ============================================================ */

function renderWarbandValidation(warband) {

    if (
        typeof validateWarband !== "function"
    ) {

        return "";

    }


    const result =
        validateWarband(warband);


    const totalProblems =
        result.errors.length +
        result.warnings.length;


    /* --------------------------------------------------------
       Completely valid
       -------------------------------------------------------- */

    if (
        result.valid &&
        result.warnings.length === 0
    ) {

        return `

            <section class="mm-validation mm-validation-valid">

                <div class="mm-validation-icon">
                    ✓
                </div>

                <div class="mm-validation-content">

                    <strong>
                        Warband Legal
                    </strong>

                    <p>
                        All current roster checks passed.
                    </p>

                </div>

            </section>

        `;

    }


    /* --------------------------------------------------------
       Build error list
       -------------------------------------------------------- */

    const errors =
        result.errors
            .map(
                item =>
                    renderValidationItem(
                        item,
                        "error"
                    )
            )
            .join("");


    const warnings =
        result.warnings
            .map(
                item =>
                    renderValidationItem(
                        item,
                        "warning"
                    )
            )
            .join("");


    return `

        <section
            class="
                mm-validation
                ${
                    result.valid
                        ? "mm-validation-warning"
                        : "mm-validation-error"
                }
            "
        >

            <div class="mm-validation-header">

                <div class="mm-validation-icon">

                    ${
                        result.valid
                            ? "⚠"
                            : "✕"
                    }

                </div>

                <div>

                    <strong>

                        ${
                            result.valid
                                ? "Warband Needs Attention"
                                : "Warband Has Rule Violations"
                        }

                    </strong>

                    <p>

                        ${totalProblems}

                        ${
                            totalProblems === 1
                                ? " issue"
                                : " issues"
                        }

                        found.

                    </p>

                </div>

            </div>


            <div class="mm-validation-list">

                ${errors}

                ${warnings}

            </div>

        </section>

    `;

}


/* ============================================================
   VALIDATION ITEM
   ============================================================ */

function renderValidationItem(
    item,
    type
) {

    const icon =
        type === "error"
            ? "✕"
            : "⚠";


    /*
     * If the validation result contains a fighter ID,
     * allow the user to jump directly to that fighter.
     */

    const action =
        item.fighterId

            ?

            `
                <button
                    class="mm-validation-link"
                    onclick="
                        focusFighter(
                            '${escapeAttribute(item.fighterId)}'
                        )
                    "
                >
                    View fighter
                </button>
            `

            :

            "";


    return `

        <div
            class="
                mm-validation-item
                mm-validation-item-${type}
            "
        >

            <span class="mm-validation-item-icon">
                ${icon}
            </span>

            <span class="mm-validation-message">
                ${escapeHtml(item.message)}
            </span>

            ${action}

        </div>

    `;

}


/* ============================================================
   FOCUS FIGHTER
   ============================================================ */

function focusFighter(fighterId) {

    if (!fighterId) {
        return;
    }


    /*
     * First try to find the fighter on the current page.
     */

    const element =
        document.querySelector(
            `[data-fighter-id="${CSS.escape(fighterId)}"]`
        );


    if (element) {

        element.scrollIntoView({

            behavior: "smooth",

            block: "center"

        });


        element.classList.add(
            "mm-fighter-highlight"
        );


        setTimeout(
            () => {

                element.classList.remove(
                    "mm-fighter-highlight"
                );

            },
            2000
        );


        return;

    }


    /*
     * If it isn't currently rendered, try opening
     * the fighter editor.
     */

    if (
        typeof showEditFighter === "function"
    ) {

        showEditFighter(
            fighterId
        );

    }

}


/* ============================================================
   RULE SOURCE CARD
   ============================================================ */

function renderRulesSourceCard(source) {

    if (!source) {
        return "";
    }


    return `

        <div class="mm-rules-source-card">

            <div>

                <span class="mm-badge">
                    Rules Source
                </span>

                <h3>
                    ${escapeHtml(
                        source.document ||
                        "Mordheim Rules"
                    )}
                </h3>

            </div>


            ${
                source.url

                    ?

                    `
                        <a
                            class="mm-button"
                            href="${escapeAttribute(source.url)}"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Open Rules ↗
                        </a>
                    `

                    :

                    ""
            }

        </div>

    `;

}


/* ============================================================
   PUBLIC API
   ============================================================ */

window.MordeManagerRulesUI = {

    renderWarbandValidation,

    renderValidationItem,

    focusFighter,

    renderRulesSourceCard

};


window.renderWarbandValidation =
    renderWarbandValidation;

window.focusFighter =
    focusFighter;
