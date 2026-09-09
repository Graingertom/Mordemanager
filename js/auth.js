/* ============================================================
   MORDEMANAGER
   Authentication (Supabase)
   ============================================================ */

/* ============================================================
   SESSION BOOTSTRAP
   ============================================================ */

/*
 * Returns a promise that resolves once the initial signed-in /
 * signed-out state is known, so initialise() can await it before
 * loading anything that depends on who's signed in. The same
 * listener keeps running afterwards for later sign-in/sign-out
 * events, at which point it reloads warbands/games (via
 * loadPlayerData) and re-renders - unlike the first firing,
 * where initialise() itself does that once this promise resolves.
 */

function initAuth() {

    let resolveReady;


    const ready =
        new Promise(
            resolve => {

                resolveReady =
                    resolve;

            }
        );


    let isFirstEvent =
        true;


    supabaseClient.auth.onAuthStateChange(
        async (
            event,
            session
        ) => {

            state.session =
                session;


            if (session) {

                await loadCurrentProfile();

            } else {

                state.profile =
                    null;

            }


            if (isFirstEvent) {

                isFirstEvent =
                    false;

                resolveReady();

                return;

            }


            await loadPlayerData();


            if (
                typeof renderApplication ===
                "function"
            ) {

                renderApplication();

            }

        }
    );


    return ready;

}


async function loadCurrentProfile() {

    const user =
        getCurrentUser();


    if (!user) {

        state.profile =
            null;

        return;

    }


    const {
        data,
        error
    } =
        await supabaseClient
            .from("profiles")
            .select("*")
            .eq(
                "id",
                user.id
            )
            .single();


    if (error) {

        console.warn(
            "Unable to load profile:",
            error.message
        );

        state.profile =
            null;

        return;

    }


    state.profile =
        data;

}


function getCurrentUser() {

    return state.session?.user ||
        null;

}


function getCurrentDisplayName() {

    return state.profile?.display_name ||
        getCurrentUser()?.email ||
        "";

}


/* ============================================================
   HEADER CONTROL
   ============================================================ */

function renderAuthControl() {

    const user =
        getCurrentUser();


    if (!user) {

        return `

            <button
                class="mm-button"
                onclick="showSignIn()"
            >
                Sign In
            </button>

        `;

    }


    return `

        <button
            class="mm-button"
            onclick="showAccount()"
        >
            ${escapeHtml(
                getCurrentDisplayName()
            )}
        </button>

    `;

}


/* ============================================================
   SIGN IN (MAGIC LINK)
   ============================================================ */

function showSignIn() {

    openModal(`

        <div class="mm-modal">

            <div class="mm-modal-header">

                <h2>
                    Sign In
                </h2>

                <button
                    class="mm-modal-close"
                    onclick="closeModal()"
                >
                    ×
                </button>

            </div>


            <div class="mm-modal-body">

                <p class="mm-muted">
                    Enter your email and we will send you a
                    link to sign in - no password needed.
                </p>


                <label class="mm-field">

                    <span>
                        Email
                    </span>

                    <input
                        id="sign-in-email"
                        type="email"
                        placeholder="you@example.com"
                        autocomplete="email"
                    >

                </label>


                <div id="sign-in-status"></div>

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
                    onclick="sendMagicLink()"
                >
                    Send Magic Link
                </button>

            </div>

        </div>

    `);

}


async function sendMagicLink() {

    const input =
        document.getElementById(
            "sign-in-email"
        );


    const statusContainer =
        document.getElementById(
            "sign-in-status"
        );


    const email =
        input?.value.trim();


    if (!email) {

        input?.focus();

        return;

    }


    const button =
        document.querySelector(
            ".mm-modal-footer .mm-button-primary"
        );


    if (button) {

        button.disabled = true;

        button.textContent =
            "Sending...";

    }


    const {
        error
    } =
        await supabaseClient.auth.signInWithOtp({

            email,

            options: {

                emailRedirectTo:
                    window.location.origin +
                    window.location.pathname

            }

        });


    if (error) {

        if (statusContainer) {

            statusContainer.innerHTML = `

                <div class="mm-validation mm-validation-error">
                    <strong>
                        ${escapeHtml(error.message)}
                    </strong>
                </div>

            `;

        }


        if (button) {

            button.disabled = false;

            button.textContent =
                "Send Magic Link";

        }

        return;

    }


    if (statusContainer) {

        statusContainer.innerHTML = `

            <div class="mm-validation mm-validation-success">
                <strong>
                    Check your email
                </strong>
                <p>
                    We sent a sign-in link to
                    ${escapeHtml(email)}.
                    Open it on this device to finish
                    signing in.
                </p>
            </div>

        `;

    }


    if (button) {

        button.textContent =
            "Link Sent";

    }

}


/* ============================================================
   ACCOUNT / SIGN OUT
   ============================================================ */

function showAccount() {

    const user =
        getCurrentUser();


    if (!user) {

        return;

    }


    openModal(`

        <div class="mm-modal">

            <div class="mm-modal-header">

                <h2>
                    Account
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
                        Display Name
                    </span>

                    <input
                        id="account-display-name"
                        type="text"
                        autocomplete="off"
                        value="${escapeAttribute(
                            getCurrentDisplayName()
                        )}"
                    >

                </label>


                <p class="mm-muted">
                    Signed in as ${escapeHtml(user.email)}
                </p>

            </div>


            <div class="mm-modal-footer">

                <button
                    class="mm-button mm-button-danger"
                    onclick="signOut()"
                >
                    Sign Out
                </button>


                <button
                    class="mm-button mm-button-primary"
                    onclick="saveDisplayName()"
                >
                    Save
                </button>

            </div>

        </div>

    `);

}


async function saveDisplayName() {

    const user =
        getCurrentUser();


    if (!user) {

        return;

    }


    const input =
        document.getElementById(
            "account-display-name"
        );


    const displayName =
        input?.value.trim();


    if (!displayName) {

        input?.focus();

        return;

    }


    const {
        error
    } =
        await supabaseClient
            .from("profiles")
            .update({
                display_name:
                    displayName
            })
            .eq(
                "id",
                user.id
            );


    if (error) {

        alert(
            "Unable to save display name: " +
            error.message
        );

        return;

    }


    await loadCurrentProfile();


    closeModal();


    renderApplication();

}


async function signOut() {

    await supabaseClient.auth.signOut();


    closeModal();

}
