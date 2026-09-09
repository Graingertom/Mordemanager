/* ============================================================
   MORDEMANAGER
   Skills / Rules UI
   ============================================================ */


/* ============================================================
   SKILL LOOKUP
   ============================================================ */

function getSkill(skillId) {

    if (!skillId || !state.skills) {
        return null;
    }

    /*
     * Supports either:
     *
     * skills.json
     * {
     *     "skills": [...]
     * }
     *
     * or:
     *
     * skills.json
     * {
     *     "skills": {
     *         "skill_id": {...}
     *     }
     * }
     */

    const skills =
        state.skills.skills;

    if (Array.isArray(skills)) {

        return skills.find(
            skill =>
                skill.id === skillId
        ) || null;

    }

    if (
        skills &&
        typeof skills === "object"
    ) {

        return skills[skillId] || null;

    }

    return null;
}


/* ============================================================
   SKILL TAG
   ============================================================ */

function renderSkillTag(skillId) {

    const skill =
        getSkill(skillId);

    if (!skill) {

        return `

            <span class="mm-skill-tag">
                ${escapeHtml(skillId)}
            </span>

        `;

    }

    return `

        <button
            type="button"
            class="mm-skill-tag"
            onclick="
                showSkill(
                    '${escapeAttribute(skill.id)}'
                )
            "
        >

            ${escapeHtml(
                skill.name || skill.id
            )}

        </button>

    `;
}


/* ============================================================
   SKILL LIST
   ============================================================ */

function renderSkills(skills) {

    if (
        !Array.isArray(skills) ||
        !skills.length
    ) {

        return `
            <span class="mm-muted">
                None
            </span>
        `;

    }

    return skills
        .map(renderSkillTag)
        .join("");
}


/* ============================================================
   SHOW SKILL
   ============================================================ */

function showSkill(skillId) {

    const skill =
        getSkill(skillId);

    const canGoBack =
        modalCanGoBack();

    if (!skill) {

        pushModal(`

            <div class="mm-modal">

                <div class="mm-modal-header">

                    <div>

                        ${
                            canGoBack
                                ? `
                                    <button
                                        class="mm-back-button mm-modal-back"
                                        onclick="goBackModal()"
                                    >
                                        ← Back
                                    </button>
                                `
                                : ""
                        }

                        <h2>
                            ${escapeHtml(skillId)}
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

                    <p class="mm-muted">
                        No detailed rules text is currently
                        available for this skill.
                    </p>

                </div>

            </div>

        `);

        return;
    }


    const description =
        skill.description ||
        skill.summary ||
        "No description available.";


    pushModal(`

        <div class="mm-modal">

            <div class="mm-modal-header">

                <div>

                    ${
                        canGoBack
                            ? `
                                <button
                                    class="mm-back-button mm-modal-back"
                                    onclick="goBackModal()"
                                >
                                    ← Back
                                </button>
                            `
                            : ""
                    }

                    ${
                        skill.category

                        ?

                        `
                            <span class="mm-badge">
                                ${escapeHtml(
                                    skill.category
                                )}
                            </span>
                        `

                        :

                        ""
                    }

                    <h2>
                        ${escapeHtml(
                            skill.name ||
                            skill.id
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

                <div class="mm-rule-description">

                    ${formatRuleText(
                        description
                    )}

                </div>


                ${
                    skill.requirements

                    ?

                    `
                        <div class="mm-rule-block">

                            <h3>
                                Requirements
                            </h3>

                            <p>
                                ${escapeHtml(
                                    skill.requirements
                                )}
                            </p>

                        </div>
                    `

                    :

                    ""
                }


                ${renderSourceInformation(skill)}

            </div>

        </div>

    `);
}


/* ============================================================
   RULE TEXT
   ============================================================ */

function formatRuleText(text) {

    if (!text) {
        return "";
    }

    /*
     * Escape first so rules text cannot inject HTML.
     */

    return escapeHtml(text)
        .replace(/\n\n+/g, "</p><p>")
        .replace(/\n/g, "<br>");

}


/* ============================================================
   PUBLIC API
   ============================================================ */

window.MordeManager =
    window.MordeManager || {};

Object.assign(
    window.MordeManager,
    {

        getSkill,

        renderSkillTag,

        renderSkills,

        showSkill

    }
);


/* Legacy globals for current inline handlers */

window.getSkill =
    getSkill;

window.renderSkillTag =
    renderSkillTag;

window.renderSkills =
    renderSkills;

window.showSkill =
    showSkill;


console.log(
    "MordeManager skills module loaded."
);
