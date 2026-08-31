/* ============================================================
   MORDEMANAGER
   Rules UI
   ============================================================ */


/* ============================================================
   WARBAND VALIDATION PANEL
   ============================================================ */

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
