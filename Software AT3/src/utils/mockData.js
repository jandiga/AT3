// Mock data for testing when database is not available

export const mockLeagues = [
    {
        _id: '507f1f77bcf86cd799439011',
        leagueName: 'Test League 1',
        description: 'A test league for development',
        createdByTeacherID: {
            _id: '507f1f77bcf86cd799439012',
            name: 'Teacher Test'
        },
        classCode: 'TEST123',
        maxParticipants: 4,
        maxPlayersPerTeam: 3,
        isPublic: true,
        status: 'drafting',
        draftSettings: {
            draftType: 'snake',
            timeLimitPerPick: 60,
            autoDraft: false
        },
        draftState: {
            isActive: true,
            currentRound: 1,
            currentPick: 1,
            currentTurnUserID: {
                _id: '507f1f77bcf86cd799439013',
                name: 'Student 1'
            },
            draftOrder: [
                {
                    _id: '507f1f77bcf86cd799439013',
                    name: 'Student 1'
                },
                {
                    _id: '507f1f77bcf86cd799439014',
                    name: 'Student 2'
                }
            ],
            pickHistory: [],
            isDraftComplete: false
        },
        participants: [
            {
                userID: {
                    _id: '507f1f77bcf86cd799439013',
                    name: 'Student 1'
                },
                teamID: {
                    _id: '507f1f77bcf86cd799439015',
                    teamName: 'Team Alpha',
                    roster: []
                },
                joinedAt: new Date(),
                isActive: true
            },
            {
                userID: {
                    _id: '507f1f77bcf86cd799439014',
                    name: 'Student 2'
                },
                teamID: {
                    _id: '507f1f77bcf86cd799439016',
                    teamName: 'Team Beta',
                    roster: []
                },
                joinedAt: new Date(),
                isActive: true
            }
        ],
        draftPool: [
            {
                _id: '507f1f77bcf86cd799439017',
                name: 'Player 1',
                academicHistory: [
                    { grade_percent: 85, date: new Date() },
                    { grade_percent: 90, date: new Date() }
                ],
                weeklyStudyContributions: [
                    { hours: 5, week: 1 },
                    { hours: 7, week: 2 }
                ]
            },
            {
                _id: '507f1f77bcf86cd799439018',
                name: 'Player 2',
                academicHistory: [
                    { grade_percent: 78, date: new Date() },
                    { grade_percent: 82, date: new Date() }
                ],
                weeklyStudyContributions: [
                    { hours: 4, week: 1 },
                    { hours: 6, week: 2 }
                ]
            },
            {
                _id: '507f1f77bcf86cd799439019',
                name: 'Player 3',
                academicHistory: [
                    { grade_percent: 92, date: new Date() },
                    { grade_percent: 88, date: new Date() }
                ],
                weeklyStudyContributions: [
                    { hours: 8, week: 1 },
                    { hours: 9, week: 2 }
                ]
            }
        ],
        dateCreated: new Date()
    }
];

export const mockUsers = [
    {
        _id: '507f1f77bcf86cd799439012',
        name: 'Teacher Test',
        email: 'teacher@test.com',
        role: 'Teacher',
        classCode: 'TEST123'
    },
    {
        _id: '507f1f77bcf86cd799439013',
        name: 'Student 1',
        email: 'student1@test.com',
        role: 'Student'
    },
    {
        _id: '507f1f77bcf86cd799439014',
        name: 'Student 2',
        email: 'student2@test.com',
        role: 'Student'
    }
];

export const mockPlayers = [
    {
        _id: '507f1f77bcf86cd799439017',
        name: 'Player 1',
        academicHistory: [
            { grade_percent: 85, date: new Date() },
            { grade_percent: 90, date: new Date() }
        ],
        weeklyStudyContributions: [
            { hours: 5, week: 1 },
            { hours: 7, week: 2 }
        ],
        createdByTeacherID: '507f1f77bcf86cd799439012',
        classCode: 'TEST123'
    },
    {
        _id: '507f1f77bcf86cd799439018',
        name: 'Player 2',
        academicHistory: [
            { grade_percent: 78, date: new Date() },
            { grade_percent: 82, date: new Date() }
        ],
        weeklyStudyContributions: [
            { hours: 4, week: 1 },
            { hours: 6, week: 2 }
        ],
        createdByTeacherID: '507f1f77bcf86cd799439012',
        classCode: 'TEST123'
    },
    {
        _id: '507f1f77bcf86cd799439019',
        name: 'Player 3',
        academicHistory: [
            { grade_percent: 92, date: new Date() },
            { grade_percent: 88, date: new Date() }
        ],
        weeklyStudyContributions: [
            { hours: 8, week: 1 },
            { hours: 9, week: 2 }
        ],
        createdByTeacherID: '507f1f77bcf86cd799439012',
        classCode: 'TEST123'
    }
];

export function getMockLeague(leagueId) {
    return mockLeagues.find(league => league._id === leagueId);
}

export function getMockUser(userId) {
    return mockUsers.find(user => user._id === userId);
}

export function getMockPlayer(playerId) {
    return mockPlayers.find(player => player._id === playerId);
}

export function isUserParticipant(league, userId) {
    return league.participants.some(p => 
        p.userID._id === userId && p.isActive
    );
}

export function getUserTeam(league, userId) {
    const participant = league.participants.find(p => 
        p.userID._id === userId && p.isActive
    );
    return participant?.teamID;
}

export function isUserTurn(league, userId) {
    return league.draftState.currentTurnUserID && 
           league.draftState.currentTurnUserID._id === userId;
}

export function getAvailablePlayers(league) {
    const draftedPlayerIds = league.draftState.pickHistory.map(pick => pick.playerID._id);
    return league.draftPool.filter(player => 
        !draftedPlayerIds.includes(player._id)
    );
}
