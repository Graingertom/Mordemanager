/* ============================================================
   MORDEMANAGER
   Games
   ============================================================ */


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
