<div component="widget/board-stats" class="widget-board-stats border border-secondary">
    <h3 class="text-bg-secondary py-2 px-3 fs-6 fw-bold mt-0">{{tx("board-stats:who-is-online")}} <a class="text-reset fw-normal" href="{config.relative_path}/users?section=online">&lsqb;{{tx("board-stats:full-list")}}&rsqb;</a></h3>
    <p class="py-0 px-3">
        {{tx("board-stats:active-users-and-guests", count, members, guests)}}
        <br/>
        <span component="widget/board-stats/list">{{list}}</span>
    </p>

    <h3 class="text-bg-secondary py-2 px-3 fs-6 fw-bold mt-0">{{tx("board-stats:board-statistics")}}</h3>
    <p class="py-0 px-3">
        {{tx("board-stats:posts-and-topics-made", posts, topics)}}
        <br />
        {{tx("board-stats:registered-members", registered)}}
        <br />
        {{{ if latest }}}
        {{tx("board-stats:welcome-newest-member", concat(config.relative_path, "/user/", latest.userslug), latest.username)}}
        <br />
        {{{ end }}}
        {{tx("board-stats:most-online-ever", mostUsers.total, mostUsers.date)}}
    </p>
</div>