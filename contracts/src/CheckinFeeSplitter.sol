// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CheckinFeeSplitter
 * @notice Simple contract to split check-in fees between two recipients
 * @dev User sends any ETH amount, contract splits 50-50 to two recipients
 */
contract CheckinFeeSplitter {
    address public immutable recipient1;
    address public immutable recipient2;
    
    // Base Builder Code for attribution
    bytes public constant BUILDER_CODE = "bc_gy096wvf";
    
    event Checkin(
        address indexed user,
        uint256 amount,
        uint256 timestamp
    );
    
    error ZeroAmount();
    error TransferFailed();
    
    constructor(
        address _recipient1,
        address _recipient2
    ) {
        recipient1 = _recipient1;
        recipient2 = _recipient2;
    }
    
    /**
     * @notice Check in by sending any ETH amount (dynamic pricing)
     * @dev Splits fee 50-50 between recipients
     */
    function checkin() external payable {
        if (msg.value == 0) revert ZeroAmount();
        
        uint256 halfFee = msg.value / 2;
        
        // Transfer to recipient1
        (bool success1, ) = recipient1.call{value: halfFee}("");
        if (!success1) revert TransferFailed();
        
        // Transfer to recipient2 (remaining balance to handle odd wei)
        (bool success2, ) = recipient2.call{value: address(this).balance}("");
        if (!success2) revert TransferFailed();
        
        emit Checkin(msg.sender, msg.value, block.timestamp);
    }
    
    /**
     * @notice Get contract configuration
     */
    function getConfig() external view returns (
        address _recipient1,
        address _recipient2
    ) {
        return (recipient1, recipient2);
    }
}
