'use strict';

const nconf = require.main.require('nconf');

const db = require.main.require('./src/database');
const user = require.main.require('./src/user');
const meta = require.main.require('./src/meta');
const utils = require.main.require('./src/utils');
const translator = require.main.require('./src/translator');

const socketPlugins = require.main.require('./src/socket.io/plugins');
const adminRooms = require.main.require('./src/socket.io/admin/rooms');

let app;

const Widget = module.exports;

const relativePath = nconf.get('relative_path');

Widget.init = function (params, callback) {
	app = params.app;
	callback();
};

socketPlugins.boardStats = {};
socketPlugins.boardStats.get = async function (socket) {
	return await getWidgetData(socket.uid);
};


async function getWidgetData(uid) {
	const [global, latestUser, activeUsers, onlineUsers, settings] = await Promise.all([
		db.getObjectFields('global', ['topicCount', 'postCount', 'userCount']),
		getLatestUser(uid),
		getActiveUsers(),
		Widget.updateAndGetOnlineUsers(),
		user.getSettings(uid),
	]);


	const dateStr = (new Date(parseInt(onlineUsers.timestamp, 10))).toLocaleDateString(settings.userLang, {
		weekday: 'short',
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	});

	return {
		count: utils.makeNumberHumanReadable(onlineUsers.onlineCount + onlineUsers.guestCount),
		members: utils.makeNumberHumanReadable(onlineUsers.onlineCount),
		guests: utils.makeNumberHumanReadable(onlineUsers.guestCount),
		list: joinUsers(activeUsers),
		posts: utils.makeNumberHumanReadable(global.postCount ? global.postCount : 0),
		topics: utils.makeNumberHumanReadable(global.topicCount ? global.topicCount : 0),
		registered: utils.makeNumberHumanReadable(global.userCount ? global.userCount : 0),
		latest: latestUser,
		relative_path: nconf.get('relative_path'),
		mostUsers: {
			date: dateStr.replace(/,/g, '&#44;'),
			total: onlineUsers.total,
		},
	};
}

async function getActiveUsers() {
	const uids = await user.getUidsFromSet('users:online', 0, 19);
	const userData = await user.getUsersFields(uids, ['username', 'userslug', 'status']);
	return userData.filter(user => user.status === 'online');
}

async function getLatestUser(uid) {
	const uids = await user.getUidsFromSet('users:joindate', 0, 0);
	const userData = await user.getUsersWithFields(uids, ['username', 'userslug'], uid);
	return userData.length ? userData[0] : null;
}

function joinUsers(usersData) {
	return usersData
		.map(user => `<a class="fw-bold" href="${relativePath}/user/${user.userslug}">${user.username}</a>`)
		.join(', ');
}

Widget.updateAndGetOnlineUsers = async function () {
	const now = Date.now();
	const [onlineUserCount, onlineGuestCount, widgetData] = await Promise.all([
		db.sortedSetCount('users:online', now - (meta.config.onlineCutoff * 60000), '+inf'),
		adminRooms.getTotalGuestCount(),
		db.getObjectFields('plugin:widget-board-stats', ['total', 'timestamp']),
	]);

	const totalUsers = onlineUserCount + onlineGuestCount;
	widgetData.timestamp = widgetData.timestamp || Date.now();

	if (parseInt(widgetData.total || 0, 10) <= totalUsers) {
		widgetData.timestamp = Date.now();
		widgetData.total = totalUsers;
		await db.setObject('plugin:widget-board-stats', widgetData);
	}

	widgetData.onlineCount = onlineUserCount;
	widgetData.guestCount = onlineGuestCount;
	return widgetData;
};

Widget.renderWidget = async function (widget) {
	const data = await getWidgetData(widget.uid);
	const html = await app.renderAsync('widgets/board-stats', data);
	widget.html = html;
	return widget;
};

Widget.defineWidgets = async function (widgets) {
	const widget = {
		widget: 'board-stats',
		name: 'Board Stats',
		description: 'Classical board stats widget in real-time.',
		content: 'admin/board-stats',
	};

	const html = await app.renderAsync(widget.content, {});
	widget.content = html;
	widgets.push(widget);
	return widgets;
};
