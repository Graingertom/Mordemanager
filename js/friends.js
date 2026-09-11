/* ============================================================
   MORDEMANAGER
   Friends
   ============================================================ */


/*
 * Cache of the last search_users() results, so the "Add Friend"
 * onclick handlers can look a row up by id instead of encoding
 * a display name (which could contain quote characters) directly
 * into an HTML attribute.
 */

let lastUserSearchResults = [];


/* ============================================================
   LOAD FRIEND DATA
   ============================================================ */

async function loadFriendData() {

    const user =
        getCurrentUser();


    if (!user) {

        state.friends = [];

        state.incomingRequests = [];

        state.outgoingRequests = [];

        return;

    }


    const {
        data,
        error
    } =
        await supabaseClient
            .from("friendships")
            .select(`
                id,
                requesterId:requester_id,
                addresseeId:addressee_id,
                status,
                createdAt:created_at,
                requester:profiles!friendships_requester_id_fkey(display_name),
                addressee:profiles!friendships_addressee_id_fkey(display_name)
            `);


    if (error) {

        console.error(
            "Unable to load friends:",
            error.message
        );

        state.friends = [];

        state.incomingRequests = [];

        state.outgoingRequests = [];

        return;

    }


    const rows =
        data || [];


    state.friends =
        rows
            .filter(
                row =>
                    row.status === "accepted"
            )
            .map(
                row => {

                    const isRequester =
                        row.requesterId === user.id;


                    return {

                        friendshipId:
                            row.id,

                        userId:
                            isRequester
                                ? row.addresseeId
                                : row.requesterId,

                        displayName:
                            (
                                isRequester
                                    ? row.addressee?.display_name
                                    : row.requester?.display_name
                            ) || "Unknown"

                    };

                }
            );


    state.incomingRequests =
        rows
            .filter(
                row =>
                    row.status === "pending" &&
                    row.addresseeId === user.id
            )
            .map(
                row => ({

                    friendshipId:
                        row.id,

                    userId:
                        row.requesterId,

                    displayName:
                        row.requester?.display_name || "Unknown"

                })
            );


    state.outgoingRequests =
        rows
            .filter(
                row =>
                    row.status === "pending" &&
                    row.requesterId === user.id
            )
            .map(
                row => ({

                    friendshipId:
                        row.id,

                    userId:
                        row.addresseeId,

                    displayName:
                        row.addressee?.display_name || "Unknown"

                })
            );

}


/* ============================================================
   FRIENDS PAGE
   ============================================================ */

function showFriendsPage() {

    state.showFriendsPage =
        true;

    state.currentWarbandId =
        null;

    state.currentGameId =
        null;


    renderApplication();

}


function closeFriendsPage() {

    state.showFriendsPage =
        false;


    renderApplication();

}


function renderFriendsPage() {

    const app =
        document.getElementById(
            "app"
        );


    app.innerHTML = `

        <div class="mm-app">

            <header class="mm-header">

                <div>

                    <button
                        class="mm-back-button"
                        onclick="closeFriendsPage()"
                    >
                        ← Dashboard
                    </button>


                    <div class="mm-logo">
                        Friends
                    </div>

                </div>

            </header>


            <main class="mm-main">

                <section class="mm-section">

                    <div class="mm-section-header">

                        <div>

                            <h2>
                                Add A Friend
                            </h2>

                            <p>
                                Search by display name. They'll
                                need to accept before you can see
                                their warbands and games.
                            </p>

                        </div>

                    </div>


                    <div class="mm-injury-add">

                        <input
                            id="friend-search-input"
                            type="text"
                            placeholder="Search by display name"
                            onkeydown="
                                if (event.key === 'Enter') {
                                    event.preventDefault();
                                    searchUsersForFriends();
                                }
                            "
                        >

                        <button
                            type="button"
                            class="mm-button"
                            onclick="searchUsersForFriends()"
                        >
                            Search
                        </button>

                    </div>


                    <div id="friend-search-results"></div>

                </section>


                ${
                    state.incomingRequests.length
                        ? `
                            <section class="mm-section">

                                <div class="mm-section-header">

                                    <div>
                                        <h2>
                                            Friend Requests
                                        </h2>
                                    </div>

                                </div>


                                <div class="mm-warband-select-list">

                                    ${state.incomingRequests
                                        .map(
                                            request => `

                                                <div class="mm-equipment-option">

                                                    <span>
                                                        <strong>
                                                            ${escapeHtml(request.displayName)}
                                                        </strong>
                                                    </span>

                                                    <button
                                                        type="button"
                                                        class="mm-button mm-button-small mm-button-primary"
                                                        onclick="acceptFriendRequest('${escapeAttribute(request.friendshipId)}')"
                                                    >
                                                        Accept
                                                    </button>

                                                    <button
                                                        type="button"
                                                        class="mm-button mm-button-small mm-button-danger"
                                                        onclick="removeFriendship('${escapeAttribute(request.friendshipId)}')"
                                                    >
                                                        Decline
                                                    </button>

                                                </div>

                                            `
                                        )
                                        .join("")}

                                </div>

                            </section>
                        `
                        : ""
                }


                ${
                    state.outgoingRequests.length
                        ? `
                            <section class="mm-section">

                                <div class="mm-section-header">

                                    <div>
                                        <h2>
                                            Sent Requests
                                        </h2>
                                    </div>

                                </div>


                                <div class="mm-warband-select-list">

                                    ${state.outgoingRequests
                                        .map(
                                            request => `

                                                <div class="mm-equipment-option">

                                                    <span>
                                                        <strong>
                                                            ${escapeHtml(request.displayName)}
                                                        </strong>

                                                        <small>
                                                            Waiting for them to accept
                                                        </small>
                                                    </span>

                                                    <button
                                                        type="button"
                                                        class="mm-button mm-button-small"
                                                        onclick="removeFriendship('${escapeAttribute(request.friendshipId)}')"
                                                    >
                                                        Cancel
                                                    </button>

                                                </div>

                                            `
                                        )
                                        .join("")}

                                </div>

                            </section>
                        `
                        : ""
                }


                <section class="mm-section">

                    <div class="mm-section-header">

                        <div>
                            <h2>
                                Your Friends
                            </h2>
                        </div>

                    </div>


                    ${
                        state.friends.length
                            ? `
                                <div class="mm-warband-select-list">

                                    ${state.friends
                                        .map(
                                            friend => `

                                                <div class="mm-equipment-option">

                                                    <span>
                                                        <strong>
                                                            ${escapeHtml(friend.displayName)}
                                                        </strong>
                                                    </span>

                                                    <button
                                                        type="button"
                                                        class="mm-button mm-button-small mm-button-primary"
                                                        onclick="viewFriend('${escapeAttribute(friend.userId)}', '${escapeAttribute(friend.displayName)}')"
                                                    >
                                                        View
                                                    </button>

                                                    <button
                                                        type="button"
                                                        class="mm-button mm-button-small mm-button-danger"
                                                        onclick="removeFriendship('${escapeAttribute(friend.friendshipId)}')"
                                                    >
                                                        Remove
                                                    </button>

                                                </div>

                                            `
                                        )
                                        .join("")}

                                </div>
                            `
                            : `
                                <div class="mm-empty-state mm-empty-small">

                                    <div class="mm-empty-icon">
                                        🤝
                                    </div>

                                    <h3>
                                        No Friends Yet
                                    </h3>

                                    <p>
                                        Search for someone above
                                        to send a request.
                                    </p>

                                </div>
                            `
                    }

                </section>

            </main>


            <div id="modal-container"></div>

        </div>

    `;

}


async function searchUsersForFriends() {

    const input =
        document.getElementById(
            "friend-search-input"
        );


    const resultsContainer =
        document.getElementById(
            "friend-search-results"
        );


    if (!resultsContainer) {

        return;

    }


    resultsContainer.innerHTML =
        `<p class="mm-muted">Searching...</p>`;


    const {
        data,
        error
    } =
        await supabaseClient.rpc(
            "search_users",
            {
                search_term:
                    input?.value.trim() || ""
            }
        );


    if (error) {

        resultsContainer.innerHTML =
            `<p class="mm-muted">Search failed: ${escapeHtml(error.message)}</p>`;

        return;

    }


    const existingIds =
        new Set([

            ...state.friends.map(
                friend =>
                    friend.userId
            ),

            ...state.incomingRequests.map(
                request =>
                    request.userId
            ),

            ...state.outgoingRequests.map(
                request =>
                    request.userId
            )

        ]);


    const results =
        (data || []).filter(
            row =>
                !existingIds.has(row.id)
        );


    if (!results.length) {

        resultsContainer.innerHTML =
            `<p class="mm-muted">No matching users found.</p>`;

        return;

    }


    lastUserSearchResults =
        results;


    resultsContainer.innerHTML = `

        <div class="mm-warband-select-list">

            ${results
                .map(
                    row => `

                        <button
                            type="button"
                            class="mm-warband-select-option"
                            onclick="addSearchedUserAsFriend('${escapeAttribute(row.id)}')"
                        >
                            <strong>
                                ${escapeHtml(row.display_name)}
                            </strong>

                            <span>
                                Send Request
                            </span>
                        </button>

                    `
                )
                .join("")}

        </div>

    `;

}


function addSearchedUserAsFriend(
    userId
) {

    const row =
        lastUserSearchResults.find(
            item =>
                item.id === userId
        );


    if (!row) {

        return;

    }


    sendFriendRequest(
        row.id,
        row.display_name
    );

}


async function sendFriendRequest(
    userId
) {

    const user =
        getCurrentUser();


    if (!user) {

        return;

    }


    /*
     * If they already sent US a request, adding them back
     * just accepts it instead of creating a duplicate row.
     */

    const reverseRequest =
        state.incomingRequests.find(
            request =>
                request.userId === userId
        );


    if (reverseRequest) {

        await acceptFriendRequest(
            reverseRequest.friendshipId
        );

        return;

    }


    const {
        error
    } =
        await supabaseClient
            .from("friendships")
            .insert({

                requester_id:
                    user.id,

                addressee_id:
                    userId

            });


    if (error) {

        alert(
            "Unable to send friend request: " +
            error.message
        );

        return;

    }


    await loadFriendData();


    renderApplication();

}


async function acceptFriendRequest(
    friendshipId
) {

    const incoming =
        state.incomingRequests.find(
            request =>
                request.friendshipId === friendshipId
        );


    const {
        error
    } =
        await supabaseClient
            .from("friendships")
            .update({
                status: "accepted"
            })
            .eq(
                "id",
                friendshipId
            );


    if (error) {

        alert(
            "Unable to accept friend request: " +
            error.message
        );

        return;

    }


    /*
     * If we'd ALSO sent them a request before seeing theirs,
     * that duplicate outgoing row would otherwise sit around
     * forever as a stale "pending" request.
     */

    const staleOutgoing =
        incoming &&
        state.outgoingRequests.find(
            request =>
                request.userId === incoming.userId
        );


    if (staleOutgoing) {

        await supabaseClient
            .from("friendships")
            .delete()
            .eq(
                "id",
                staleOutgoing.friendshipId
            );

    }


    await loadFriendData();


    renderApplication();

}


async function removeFriendship(
    friendshipId
) {

    const {
        error
    } =
        await supabaseClient
            .from("friendships")
            .delete()
            .eq(
                "id",
                friendshipId
            );


    if (error) {

        alert(
            "Unable to remove: " +
            error.message
        );

        return;

    }


    await loadFriendData();


    renderApplication();

}


/* ============================================================
   VIEW A FRIEND'S WARBANDS + GAMES (READ ONLY)
   ============================================================ */

async function viewFriend(
    userId,
    displayName
) {

    state.viewingFriendId =
        userId;

    state.viewingFriendName =
        displayName;

    state.friendWarbands =
        [];

    state.friendGames =
        [];


    renderApplication();


    const [
        { data: warbandRows, error: warbandError },
        { data: fighterRows, error: fighterError },
        { data: gameRows, error: gameError }
    ] =
        await Promise.all([

            supabaseClient.rpc(
                "get_friend_warbands",
                { target_user_id: userId }
            ),

            supabaseClient.rpc(
                "get_friend_fighters",
                { target_user_id: userId }
            ),

            supabaseClient.rpc(
                "get_friend_games",
                { target_user_id: userId }
            )

        ]);


    if (warbandError || fighterError) {

        console.error(
            "Unable to load friend's warbands:",
            (warbandError || fighterError).message
        );

    } else {

        const fightersByWarband = {};

        for (const row of fighterRows || []) {

            const mapped = {

                id:
                    row.id,

                warbandId:
                    row.warband_id,

                type:
                    row.type,

                typeName:
                    row.type_name,

                category:
                    row.category,

                name:
                    row.name,

                profile:
                    row.profile,

                baseCost:
                    row.base_cost,

                equipment:
                    row.equipment,

                skills:
                    row.skills,

                experience:
                    row.experience,

                advances:
                    row.advances,

                injuries:
                    row.injuries

            };


            (fightersByWarband[mapped.warbandId] ||= [])
                .push(mapped);

        }


        state.friendWarbands =
            normaliseWarbands(
                (warbandRows || []).map(
                    row => ({

                        id:
                            row.id,

                        ownerId:
                            row.owner_id,

                        name:
                            row.name,

                        type:
                            row.type,

                        treasury:
                            row.treasury,

                        stash:
                            row.stash,

                        createdAt:
                            row.created_at,

                        owner:
                            displayName,

                        fighters:
                            fightersByWarband[row.id] || []

                    })
                )
            );

    }


    if (gameError) {

        console.error(
            "Unable to load friend's games:",
            gameError.message
        );

    } else {

        state.friendGames =
            (gameRows || []).map(
                row => ({

                    id:
                        row.id,

                    name:
                        row.name,

                    status:
                        row.status,

                    scenarioName:
                        row.scenario_name || ""

                })
            );

    }


    renderApplication();

}


function closeFriendView() {

    state.viewingFriendId =
        null;

    state.viewingFriendName =
        null;


    renderApplication();

}


function renderFriendDetailPage() {

    const app =
        document.getElementById(
            "app"
        );


    app.innerHTML = `

        <div class="mm-app">

            <header class="mm-header">

                <div>

                    <button
                        class="mm-back-button"
                        onclick="closeFriendView()"
                    >
                        ← Friends
                    </button>


                    <div class="mm-logo">
                        ${escapeHtml(state.viewingFriendName || "Friend")}
                    </div>

                    <div class="mm-subtitle">
                        Read only - you can't edit a friend's
                        warbands or games.
                    </div>

                </div>

            </header>


            <main class="mm-main">

                <section class="mm-section">

                    <div class="mm-section-header">

                        <div>
                            <h2>
                                Warbands
                            </h2>
                        </div>

                    </div>


                    ${
                        state.friendWarbands.length
                            ? state.friendWarbands
                                .map(renderFriendWarbandCard)
                                .join("")
                            : `
                                <p class="mm-muted">
                                    No active warbands.
                                </p>
                            `
                    }

                </section>


                <section class="mm-section">

                    <div class="mm-section-header">

                        <div>
                            <h2>
                                Games
                            </h2>
                        </div>

                    </div>


                    ${
                        state.friendGames.length
                            ? `
                                <div class="mm-warband-select-list">

                                    ${state.friendGames
                                        .map(
                                            game => `

                                                <div class="mm-equipment-option">

                                                    <span>

                                                        <strong>
                                                            ${escapeHtml(game.name)}
                                                        </strong>

                                                        <small>
                                                            ${game.status === "completed" ? "Completed" : "Active"}
                                                            ${game.scenarioName
                                                                ? ` &middot; ${escapeHtml(game.scenarioName)}`
                                                                : ""}
                                                        </small>

                                                    </span>

                                                </div>

                                            `
                                        )
                                        .join("")}

                                </div>
                            `
                            : `
                                <p class="mm-muted">
                                    Not in any games.
                                </p>
                            `
                    }

                </section>

            </main>

        </div>

    `;

}


function renderFriendWarbandCard(
    warband
) {

    const definition =
        state.warbandDefinitions[
            warband.type
        ];


    return `

        <article class="mm-card">

            <div class="mm-card-header">

                <div>

                    <span class="mm-badge">
                        ${escapeHtml(
                            definition?.faction ||
                            "Warband"
                        )}
                    </span>

                    <h2>
                        ${escapeHtml(warband.name)}
                    </h2>

                </div>

            </div>


            <div class="mm-warband-stats">

                <div>
                    <strong>
                        ${warband.fighters.length}
                    </strong>

                    <span>
                        Fighters
                    </span>
                </div>


                <div>
                    <strong>
                        ${calculateWarbandRating(warband)}
                    </strong>

                    <span>
                        Rating
                    </span>
                </div>


                <div>
                    <strong>
                        ${calculateTreasury(warband)} gc
                    </strong>

                    <span>
                        Treasury
                    </span>
                </div>

            </div>


            ${
                warband.fighters.length
                    ? warband.fighters
                        .map(renderFriendFighterCard)
                        .join("")
                    : `
                        <p class="mm-muted">
                            No fighters yet.
                        </p>
                    `
            }

        </article>

    `;

}


function renderFriendFighterCard(
    fighter
) {

    const profile =
        RulesEngine.calculateEffectiveProfile(
            fighter
        );


    const equipment =
        Array.isArray(fighter.equipment)
            ? fighter.equipment
            : [];


    return `

        <div class="mm-fighter-card">

            <div class="mm-fighter-main">

                <div class="mm-fighter-name">

                    <span class="mm-badge">
                        ${escapeHtml(fighter.category)}
                    </span>

                    <h3>
                        ${escapeHtml(fighter.name)}
                    </h3>

                    <span class="mm-fighter-type">
                        ${escapeHtml(fighter.typeName)}
                    </span>

                </div>


                <div class="mm-profile">

                    ${renderStat("M", profile.M)}
                    ${renderStat("WS", profile.WS)}
                    ${renderStat("BS", profile.BS)}
                    ${renderStat("S", profile.S)}
                    ${renderStat("T", profile.T)}
                    ${renderStat("W", profile.W)}
                    ${renderStat("I", profile.I)}
                    ${renderStat("A", profile.A)}
                    ${renderStat("Ld", profile.Ld)}

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
                                .map(renderEquipmentTag)
                                .join("")
                            : `<span class="mm-muted">None</span>`
                    }

                </div>

            </div>

        </div>

    `;

}
