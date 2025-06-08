// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";

contract FundChainX {
    event CampaignCreated(
        address indexed campaignAddress,
        address indexed creator,
        uint256 minContribution,
        uint256 deadline,
        uint256 targetAmount
    );

    address[] public deployedCampaigns;

    function createCampaign(
        uint256 minimumContribution,
        uint256 targetContribution,
        uint256 deadline
    ) public returns (address) {
        Campaign newCampaign = new Campaign(
            msg.sender, 
            minimumContribution, 
            targetContribution, 
            deadline
        );
        
        deployedCampaigns.push(address(newCampaign));
        
        emit CampaignCreated(
            address(newCampaign), 
            msg.sender, 
            minimumContribution, 
            deadline, 
            targetContribution
        );
        
        return address(newCampaign);
    }

    function getDeployedCampaigns() external view returns (address[] memory) {
        return deployedCampaigns;
    }
}

contract Campaign is ReentrancyGuard {
    enum CampaignState { ACTIVE, SUCCESS, EXPIRED, ABORTED, WITHDRAWN, FAILED }

    struct Contribution {
        address contributor;
        uint256 amount;
        uint256 timestamp;
    }

    address public creator;
    uint256 public minimumContribution;
    uint256 public deadline;
    uint256 public targetContribution;
    uint256 public raisedAmount;
    uint256 public contributorsCount;
    uint256 public totalRefunded;
    uint256 public withdrawalDelay = 14 days;
    uint256 public refundPeriodEnd; // Will be set only when explicitly needed
    bool public creatorWithdrawnRemainingFunds;
    CampaignState public state;

    mapping(address => uint256) public contributorAmounts;
    Contribution[] public contributions;

    event ContributionReceived(
        address indexed contributor, 
        uint256 amount, 
        uint256 currentTotal,
        uint256 timestamp
    );
    event FundsWithdrawn(address indexed creator, uint256 amount);
    event RefundIssued(address indexed contributor, uint256 amount);
    event CampaignStateChanged(address indexed campaignAddress, CampaignState newState);
    event RemainingFundsWithdrawn(address indexed creator, uint256 amount);

    modifier onlyCreator() {
        require(msg.sender == creator, "Campaign: Unauthorized - Creator only");
        _;
    }

    modifier inState(CampaignState _state) {
        require(state == _state, "Campaign: Invalid state for this operation");
        _;
    }

    constructor(
        address _creator,
        uint256 _minimumContribution,
        uint256 _targetContribution,
        uint256 _deadline
    ) {
        creator = _creator;
        minimumContribution = _minimumContribution;
        targetContribution = _targetContribution;
        deadline = _deadline;
        state = CampaignState.ACTIVE;
        raisedAmount = 0;
        contributorsCount = 0;
        totalRefunded = 0;
        creatorWithdrawnRemainingFunds = false;
    }

    function contribute() public payable nonReentrant {
        require(block.timestamp < deadline, "Campaign: Contribution deadline passed");
        require(state == CampaignState.ACTIVE, "Campaign: Not accepting contributions");
        require(msg.value >= minimumContribution, "Campaign: Contribution below minimum");

        if (contributorAmounts[msg.sender] == 0) {
            contributorsCount++;
        }

        contributorAmounts[msg.sender] += msg.value;
        contributions.push(Contribution(msg.sender, msg.value, block.timestamp));
        raisedAmount += msg.value;

        emit ContributionReceived(msg.sender, msg.value, raisedAmount, block.timestamp);

        if (raisedAmount >= targetContribution) {
            _updateState(CampaignState.SUCCESS);
        }
    }

    // Updated view function to return both status and computed refundPeriodEnd
    function getUpdatedCampaignStatus() public view returns (CampaignState currentState, uint256 computedRefundPeriodEnd) {
        currentState = state;
        computedRefundPeriodEnd = refundPeriodEnd;

        if (state == CampaignState.ACTIVE && block.timestamp >= deadline) {
            if (raisedAmount >= targetContribution) {
                currentState = CampaignState.SUCCESS;
            } else {
                currentState = CampaignState.FAILED;
                // Compute refundPeriodEnd as if it were set when deadline passed
                if (refundPeriodEnd == 0) {
                    computedRefundPeriodEnd = deadline + withdrawalDelay;
                }
            }
        }
        return (currentState, computedRefundPeriodEnd);
    }

    function getCampaignSummary() public view returns (
        uint256 numBackers,
        uint256 currentAmount,
        uint256 minContribution,
        uint256 campaignDeadline,
        uint256 targetAmount,
        CampaignState currentState
    ) {
        (CampaignState computedState, ) = getUpdatedCampaignStatus();
        return (
            contributorsCount,
            raisedAmount,
            minimumContribution,
            deadline,
            targetContribution,
            computedState
        );
    }

    function getContributors() public view returns (Contribution[] memory) {
        return contributions;
    }

    function withdrawFunds() public onlyCreator nonReentrant {
        (CampaignState currentState, ) = getUpdatedCampaignStatus();
        require(currentState == CampaignState.SUCCESS, "Campaign: Cannot withdraw - Goal not reached");
        require(address(this).balance > 0, "Campaign: No funds available to withdraw");

        uint256 amountToWithdraw = address(this).balance;
        
        state = CampaignState.WITHDRAWN; // Explicit state update here
        (bool sent, ) = payable(creator).call{value: amountToWithdraw}("");
        require(sent, "Campaign: Withdrawal transfer failed");

        emit FundsWithdrawn(creator, amountToWithdraw);
    }

    function claimRefund() public nonReentrant {
        (CampaignState currentState, uint256 computedRefundPeriodEnd) = getUpdatedCampaignStatus();
        
        require(
            currentState == CampaignState.ABORTED || currentState == CampaignState.FAILED, 
            "Campaign: Refunds not currently allowed"
        );

        uint256 amount = contributorAmounts[msg.sender];
        require(amount > 0, "Campaign: No contributions to refund");

        contributorsCount--;
        contributorAmounts[msg.sender] = 0;
        totalRefunded += amount;
        
        if (state == CampaignState.ACTIVE && currentState == CampaignState.FAILED) {
            // Set refundPeriodEnd on-chain only when refund is claimed for FAILED state
            refundPeriodEnd = computedRefundPeriodEnd;
            state = CampaignState.FAILED;
            emit CampaignStateChanged(address(this), CampaignState.FAILED);
        }

        (bool sent, ) = payable(msg.sender).call{value: amount}("");
        require(sent, "Campaign: Refund transfer failed");

        emit RefundIssued(msg.sender, amount);
    }

    function withdrawRemainingFunds() public onlyCreator nonReentrant {
        (CampaignState currentState, uint256 computedRefundPeriodEnd) = getUpdatedCampaignStatus();
        
        require(currentState == CampaignState.FAILED, "Campaign: Cannot withdraw - Campaign not failed");
        require(block.timestamp >= computedRefundPeriodEnd, "Campaign: Refund period not ended");
        require(!creatorWithdrawnRemainingFunds, "Campaign: Already withdrawn remaining funds");
        require(address(this).balance > 0, "Campaign: No funds available to withdraw");

        uint256 amountToWithdraw = address(this).balance;
        creatorWithdrawnRemainingFunds = true;

        if (state == CampaignState.ACTIVE) {
            state = CampaignState.FAILED; // Update state if not already set
            refundPeriodEnd = computedRefundPeriodEnd;
            emit CampaignStateChanged(address(this), CampaignState.FAILED);
        }
        state = CampaignState.WITHDRAWN;

        (bool sent, ) = payable(creator).call{value: amountToWithdraw}("");
        require(sent, "Campaign: Withdrawal transfer failed");

        emit RemainingFundsWithdrawn(creator, amountToWithdraw);
    }

    function abortCampaign() public onlyCreator nonReentrant {
        require(block.timestamp < deadline, "Campaign: Cannot abort after deadline");
        require(state == CampaignState.ACTIVE, "Campaign: Can only abort active campaign");

        _updateState(CampaignState.ABORTED);
        refundPeriodEnd = block.timestamp + withdrawalDelay;
    }

    function _updateState(CampaignState _newState) internal {
        state = _newState;
        emit CampaignStateChanged(address(this), _newState);
    }

    function getCampaignDetails() public view returns (
        address _creator,
        uint256 _minimumContribution,
        uint256 _deadline,
        uint256 _targetContribution,
        uint256 _raisedAmount,
        uint256 _contributorsCount,
        CampaignState _state,
        uint256 _totalRefunded,
        uint256 _refundPeriodEnd
    ) {
        (CampaignState computedState, uint256 computedRefundPeriodEnd) = getUpdatedCampaignStatus();
        return (
            creator,
            minimumContribution,
            deadline,
            targetContribution,
            raisedAmount,
            contributorsCount,
            computedState, // Return computed state
            totalRefunded,
            computedRefundPeriodEnd // Return computed refund period end
        );
    }

    receive() external payable {
        require(state == CampaignState.ACTIVE, "Campaign: Not accepting contributions");
        require(msg.value >= minimumContribution, "Campaign: Contribution below minimum");
        contribute();
    }
}