// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Voting {
    struct Candidate {
        string name;
        string image; // URL or IPFS hash
        uint256 voteCount;
        bool active; // new flag to mark if candidate is active
    }

    struct Voter {
        bool voted;
        uint256 voteIndex;
    }

    address public admin;
    Candidate[] public candidates;
    mapping(address => Voter) public voters;

    uint256 public startTime; // 🕒 Voting start time (timestamp)
    uint256 public endTime;   // 🕒 Voting end time (timestamp)

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    modifier votingActive() {
        require(block.timestamp >= startTime, "Voting not started yet");
        require(block.timestamp <= endTime, "Voting has ended");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    // 🕓 Admin sets voting start & end time
    function setVotingPeriod(uint256 _startTime, uint256 _endTime) public onlyAdmin {
        require(_endTime > _startTime, "End time must be after start");
        startTime = _startTime;
        endTime = _endTime;
    }

    // Add new candidate (only admin)
    function addCandidate(string memory _name, string memory _image) public onlyAdmin {
        candidates.push(Candidate({
            name: _name,
            image: _image,
            voteCount: 0,
            active: true // new candidate is active by default
        }));
    }

    // Remove candidate (only admin) - marks as inactive
    function removeCandidate(uint256 index) public onlyAdmin {
        require(index < candidates.length, "Invalid index");
        candidates[index].active = false;
    }

    // Vote for candidate by index
    function vote(uint256 candidateIndex) public votingActive {
        require(!voters[msg.sender].voted, "Already voted!");
        require(candidateIndex < candidates.length, "Invalid candidate index");
        require(candidates[candidateIndex].active, "Candidate is inactive");

        voters[msg.sender].voted = true;
        voters[msg.sender].voteIndex = candidateIndex;
        candidates[candidateIndex].voteCount++;
    }

    // Total number of candidates (including inactive)
    function totalCandidates() public view returns (uint256) {
        return candidates.length;
    }

    // Fetch candidate by index (frontend should check active flag)
    function getCandidate(uint256 index) public view returns (
        string memory name,
        string memory image,
        uint256 voteCount,
        bool active
    ) {
        require(index < candidates.length, "Invalid index");
        Candidate storage c = candidates[index];
        return (c.name, c.image, c.voteCount, c.active);
    }
}
