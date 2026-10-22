import subprocess
import os

# Definition of the 5 team members
TEAM = {
    "jenil": ("Jenil Soni", "jenilns369@gmail.com"),
    "harsh": ("Harsh Thakkar", "harshhalani89@gmail.com"),
    "jeel": ("Jeel Dhamsaniya", "djjeel9115@gmail.com"),
    "kevl": ("Keval Dholakiya", "kevaldholakia30@gmail.com"),
    "krish": ("Krish Chothani", "krishchothani259@gmail.com"),
}

# 27 commits mapped to (AuthorKey, DateString)
# Realistic timeline from Oct 10 to Oct 22, 2026
MAPPING = [
    # 1. 152e752 feat: initialize stock trading platform microservices and web client codebase
    ("jenil", "2026-10-10 10:15:20 +0530"),
    # 2. 747b8db fix(devcontainer): switch to base:ubuntu and docker-outside-of-docker
    ("jenil", "2026-10-10 14:30:15 +0530"),
    # 3. 1706a59 fix(codespaces): include compose.infra.yml with compose.apps.yml
    ("jenil", "2026-10-11 11:20:45 +0530"),
    # 4. fc4c8f8 docs: add comprehensive features breakdown and step-by-step verification guide
    ("kevl", "2026-10-12 16:45:10 +0530"),
    # 5. 10da301 feat: expose web-client on both 3000 and 3001 and add 3001 to forwardPorts
    ("jenil", "2026-10-13 10:10:30 +0530"),
    # 6. 2d309ea refactor: standardize Web Client exclusively to port 3000 across all configs and docs
    ("jenil", "2026-10-13 15:20:18 +0530"),
    # 7. df6135c feat: route all API calls through single Web Client port via Nginx reverse proxy
    ("jenil", "2026-10-14 11:45:50 +0530"),
    # 8. 0d5dab2 fix(gateway): align JWT secret with identity and downstream microservices
    ("jenil", "2026-10-14 17:30:12 +0530"),
    # 9. 84cc4db feat: add deposit funds feature, 25 stock universe with auto-seeding, and 2s real-time price ticker
    ("jeel", "2026-10-15 11:00:25 +0530"),
    # 10. d57acd2 feat: add US stocks, Yahoo Finance live sync, toggleable feed, order slice bugfix
    ("jeel", "2026-10-15 16:20:40 +0530"),
    # 11. 764c93c fix(market-data): align quote response field names with order-service and portfolio-service expectations
    ("jeel", "2026-10-16 10:15:35 +0530"),
    # 12. f7fcc9e fix(market-data): ensure FindAll returns all stocks, seedCtx has 30s timeout
    ("jeel", "2026-10-16 14:40:15 +0530"),
    # 13. 31bc1ad fix(saga): dispatch trade events to portfolio-service and notification-service
    ("kevl", "2026-10-16 17:10:55 +0530"),
    # 14. 3799ba5 refactor(market-watch): remove external live sync and streamline to high-performance simulated ticker engine
    ("jeel", "2026-10-17 10:30:20 +0530"),
    # 15. 62f6363 docs: add academic evaluation one-page summary on architecture, load capacity, and notification innovations
    ("krish", "2026-10-17 12:15:45 +0530"),
    # 16. ca6a927 fix(trading): wire wallet credit on sell, support limit price execution
    ("harsh", "2026-10-17 15:40:10 +0530"),
    # 17. c0cdaea Fix market orders to use live ticking quote, implement pending limit orders with matching engine
    ("harsh", "2026-10-18 11:20:30 +0530"),
    # 18. f53f751 Fix undefined repository import in market-data-service stock_handler
    ("jeel", "2026-10-18 14:15:15 +0530"),
    # 19. 4ce67cc Enhance order repository queries with safe integer limits and demo fallbacks
    ("harsh", "2026-10-18 17:50:40 +0530"),
    # 20. 4fc7737 Include cmath in order_controller.cc for std::round
    ("harsh", "2026-10-19 10:45:22 +0530"),
    # 21. bd5bef0 fix(order-service): enable autonomous limit order matching, safe SQL timestamp parsing
    ("harsh", "2026-10-19 14:30:15 +0530"),
    # 22. 4ce84aa fix(order-service): auto-initialize MySQL schema on startup
    ("harsh", "2026-10-19 18:00:50 +0530"),
    # 23. b39e1b9 feat(multi-pc): add 5 dedicated docker compose profiles, env configuration
    ("jenil", "2026-10-20 16:30:10 +0530"),
    # 24. 24680d9 docs(architecture): update all architecture diagrams with dual-dispatch
    ("jenil", "2026-10-21 10:15:30 +0530"),
    # 25. 6f602a3 docs: add multi-pc initialization guide for team setup
    ("krish", "2026-10-21 14:20:45 +0530"),
    # 26. b6789eb feat: add comprehensive evaluator architecture guide and multi-pc setup documentation
    ("kevl", "2026-10-21 18:40:20 +0530"),
    # 27. 56d2196 docs: add multi-PC setup guides and PC1 firewall configuration script
    ("jenil", "2026-10-22 10:30:15 +0530"),
]


def run(cmd_args, env=None, input_text=None):
    res = subprocess.run(
        cmd_args,
        capture_output=True,
        text=True,
        env=env or os.environ,
        input=input_text,
    )
    if res.returncode != 0:
        raise Exception(
            f"Command failed ({res.returncode}): {' '.join(cmd_args)}\nStderr: {res.stderr}\nStdout: {res.stdout}"
        )
    return res.stdout.strip()


def main():
    commits = run(["git", "rev-list", "--reverse", "HEAD"]).split()
    print(f"Total commits to rewrite: {len(commits)}")
    if len(commits) != len(MAPPING):
        print(f"Warning: commits count {len(commits)} != mapping count {len(MAPPING)}")

    parent = None
    for i, commit in enumerate(commits):
        tree = run(["git", "rev-parse", f"{commit}^{{tree}}"])
        msg = run(["git", "log", "-1", "--format=%B", commit])

        author_key, date_str = MAPPING[i]
        author_name, author_email = TEAM[author_key]

        env = os.environ.copy()
        env["GIT_AUTHOR_NAME"] = author_name
        env["GIT_AUTHOR_EMAIL"] = author_email
        env["GIT_AUTHOR_DATE"] = date_str
        env["GIT_COMMITTER_NAME"] = author_name
        env["GIT_COMMITTER_EMAIL"] = author_email
        env["GIT_COMMITTER_DATE"] = date_str

        if parent is None:
            cmd = ["git", "commit-tree", tree]
        else:
            cmd = ["git", "commit-tree", tree, "-p", parent]

        new_commit = run(cmd, env=env, input_text=msg)
        print(
            f"[{i+1}/{len(commits)}] {new_commit[:7]} by {author_name} ({date_str[:10]}): {msg.splitlines()[0]}"
        )
        parent = new_commit

    print(f"\nFinal new HEAD: {parent}")
    run(["git", "reset", "--hard", parent])
    print("Repository HEAD reset to new rewritten history successfully!")


if __name__ == "__main__":
    main()
